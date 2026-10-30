param([switch]$Run, [string]$WorkerInput, [string]$WorkerOutput, [ValidateRange(3,60)][int]$TimeoutSeconds = 12)
$ErrorActionPreference = 'Stop'
$script:SpeechRuntime = 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030'

function Assert-SpeechOutputPath([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path)
    foreach ($sub in @('asr','logs','artifacts')) {
        $allowed = [IO.Path]::GetFullPath("$script:SpeechRuntime/$sub/")
        if ($full.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) {
            # Refuse existing directory junctions/symlinks in the complete ancestor chain.
            $ancestor = [IO.Path]::GetDirectoryName($full)
            while ($ancestor) {
                if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'GUARD: reparse output ancestor' }
                $ancestor = [IO.Path]::GetDirectoryName($ancestor)
            }
            if ((Test-Path -LiteralPath $full) -and ((Get-Item -LiteralPath $full).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'GUARD: reparse output file' }
            return
        }
    }
    throw 'GUARD: output outside approved runtime subtrees'
}

function Assert-BytesHash([byte[]]$Bytes, [string]$Expected) {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $actual = ([BitConverter]::ToString($hasher.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() } finally { $hasher.Dispose() }
    if ($Expected -cnotmatch '^[0-9a-f]{64}$' -or $actual -cne $Expected) { throw 'GUARD: SHA256 mismatch' }
    return $actual
}

function Read-PcmWave([byte[]]$Bytes) {
    if ($Bytes.Length -lt 44 -or [Text.Encoding]::ASCII.GetString($Bytes,0,4) -ne 'RIFF' -or [Text.Encoding]::ASCII.GetString($Bytes,8,4) -ne 'WAVE') { throw 'GUARD: invalid RIFF/WAVE' }
    if ([BitConverter]::ToUInt32($Bytes,4) + 8 -ne $Bytes.Length) { throw 'GUARD: RIFF length mismatch' }
    $offset = 12; $fmt = $null; $dataStart = -1; $dataLength = 0
    while ($offset + 8 -le $Bytes.Length) {
        $tag = [Text.Encoding]::ASCII.GetString($Bytes,$offset,4)
        $size = [BitConverter]::ToUInt32($Bytes,$offset+4)
        if ([long]$offset+8+$size -gt $Bytes.Length) { throw 'GUARD: truncated WAV chunk' }
        if ($tag -eq 'fmt ') {
            if ($fmt -or $size -lt 16) { throw 'GUARD: invalid fmt chunk' }
            $fmt = @{
                encoding=[BitConverter]::ToUInt16($Bytes,$offset+8); channels=[BitConverter]::ToUInt16($Bytes,$offset+10)
                sampleRate=[BitConverter]::ToUInt32($Bytes,$offset+12); byteRate=[BitConverter]::ToUInt32($Bytes,$offset+16)
                blockAlign=[BitConverter]::ToUInt16($Bytes,$offset+20); bits=[BitConverter]::ToUInt16($Bytes,$offset+22)
            }
        }
        if ($tag -eq 'data') {
            if ($dataStart -ge 0) { throw 'GUARD: duplicate data chunk' }
            $dataStart=$offset+8; $dataLength=$size
        }
        $offset += 8 + $size + ($size % 2)
    }
    if ($offset -ne $Bytes.Length) { throw 'GUARD: incomplete WAV chunk or padding' }
    if (-not $fmt -or $dataStart -lt 0 -or $dataLength -lt 2 -or $fmt.encoding -ne 1 -or $fmt.channels -ne 1 -or $fmt.bits -ne 16 -or $fmt.sampleRate -notin @(16000,24000) -or $fmt.blockAlign -ne 2 -or $fmt.byteRate -ne $fmt.sampleRate*2 -or $dataLength%2) { throw 'GUARD: expected nonempty PCM16 mono 16/24kHz' }
    $count = $dataLength/2; $clip=0; $sum=0.0; $squares=0.0; $peak=0; $first=-1; $last=-1
    for ($n=0; $n -lt $count; $n++) {
        $sample=[int][BitConverter]::ToInt16($Bytes,$dataStart+$n*2); $abs=[Math]::Abs($sample)
        if ($abs -ge 32760) { $clip++ }
        if ($abs -gt $peak) { $peak=$abs }
        if ($abs -gt 327) { if ($first -eq -1) { $first=$n }; $last=$n }
        $sum+=$sample; $squares+=[double]$sample*$sample
    }
    return [pscustomobject]@{sampleRate=$fmt.sampleRate;channels=1;bits=16;sampleCount=$count;durationSeconds=$count/$fmt.sampleRate;clippedSamples=$clip;peak=$peak;dcOffset=$sum/$count/32768;rmsDb=if($squares){20*[Math]::Log10([Math]::Sqrt($squares/$count)/32768)}else{$null};leadingBelowMinus40DbSeconds=if($first -ge 0){$first/$fmt.sampleRate}else{$count/$fmt.sampleRate};trailingBelowMinus40DbSeconds=if($last -ge 0){($count-1-$last)/$fmt.sampleRate}else{$count/$fmt.sampleRate};silenceThreshold=327;auditoryOrNoiseVerdict='NEEDS_EVIDENCE'}
}

function Compare-Script([string]$Reference,[string]$Transcript) {
    $a=@([regex]::Matches($Reference.ToLowerInvariant(),"[a-z0-9]+(?:'[a-z]+)?") | ForEach-Object Value)
    $b=@([regex]::Matches($Transcript.ToLowerInvariant(),"[a-z0-9]+(?:'[a-z]+)?") | ForEach-Object Value)
    if (-not $a.Count) { throw 'GUARD: empty reference' }
    $previous=0..$b.Count
    for($i=1;$i -le $a.Count;$i++) {
        $current=New-Object 'int[]' ($b.Count+1); $current[0]=$i
        for($j=1;$j -le $b.Count;$j++) {
            $cost=if($a[$i-1] -ceq $b[$j-1]){0}else{1}
            $current[$j]=[Math]::Min([Math]::Min($previous[$j]+1,$current[$j-1]+1),$previous[$j-1]+$cost)
        }
        $previous=$current
    }
    return [pscustomobject]@{referenceTokens=$a;transcriptTokens=$b;referenceWords=$a.Count;distance=$previous[$b.Count];wer=$previous[$b.Count]/$a.Count;interpretation='ASR mismatch is a review candidate, not a confirmed recording defect'}
}

function Write-SpeechJson($Value,[string]$Path) {
    Assert-SpeechOutputPath $Path
    [IO.File]::WriteAllText($Path,($Value | ConvertTo-Json -Depth 30),[Text.UTF8Encoding]::new($false))
}

function New-SpeechTracePath([string]$Id) {
    if ($Id -cnotmatch '^mg0[12]-l[1-4]-audio-[abc123]$') { throw 'GUARD: invalid trace item ID' }
    $target="$script:SpeechRuntime/asr/$Id.$([Guid]::NewGuid().ToString('N')).trace.json"
    Assert-SpeechOutputPath $target
    if (Test-Path -LiteralPath $target) { throw 'GUARD: trace already exists' }
    return $target
}

function Read-SpeechWorkerResult([string]$Path,[bool]$Completed,[int]$ExitCode,[string]$InputSha256) {
    Assert-SpeechOutputPath $Path
    $failed=[pscustomobject]@{status=if($Completed){'CHILD_FAILED'}else{'TIMEOUT'};stage='UNVERIFIED_RECEIPT';segments=@();error='Missing, invalid or failed child receipt'}
    if ($Completed -and $ExitCode -ne 0) { return $failed }
    if (-not (Test-Path -LiteralPath $Path)) { return $failed }
    try { $state=Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json } catch { return $failed }
    if ($state.inputSha256 -cne $InputSha256 -or $state.status -notin @('STARTED','TRANSCRIBED','NO_RECOGNITION','ERROR')) { return $failed }
    return $state
}

function Invoke-SpeechWorker {
    Assert-SpeechOutputPath $WorkerInput; Assert-SpeechOutputPath $WorkerOutput
    $state=@{status='STARTED';stage='LOAD_ASSEMBLY';inputSha256=(Get-FileHash -LiteralPath $WorkerInput -Algorithm SHA256).Hash.ToLowerInvariant();recognizerId='MS-1033-80-DESK';grammar='DictationGrammar';segments=@();settings=@();error=$null}
    Write-SpeechJson $state $WorkerOutput
    $recognizer=$null
    try {
        Add-Type -AssemblyName System.Speech
        $state.stage='CONSTRUCT_EXACT_RECOGNIZER'; Write-SpeechJson $state $WorkerOutput
        $recognizer=New-Object System.Speech.Recognition.SpeechRecognitionEngine('MS-1033-80-DESK')
        $state.stage='DISABLE_ADAPTATION'; Write-SpeechJson $state $WorkerOutput
        foreach($setting in @('AdaptationOn','PersistedBackgroundAdaptation')) {
            try { $recognizer.UpdateRecognizerSetting($setting,0); $state.settings+=@{name=$setting;disabled=$true} }
            catch { $state.settings+=@{name=$setting;disabled=$false;error=$_.Exception.Message} }
        }
        if (@($state.settings | Where-Object { -not $_.disabled }).Count) { throw 'Adaptation could not be disabled; no recognition performed' }
        $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
        $recognizer.SetInputToWaveFile($WorkerInput)
        $state.stage='RECOGNIZE_FILE'; Write-SpeechJson $state $WorkerOutput
        while ($true) {
            $result=$recognizer.Recognize([TimeSpan]::FromSeconds(3))
            if ($null -eq $result) { break }
            $state.segments+=@{text=$result.Text;confidence=$result.Confidence;audioPositionSeconds=$result.Audio.AudioPosition.TotalSeconds;durationSeconds=$result.Audio.Duration.TotalSeconds;words=@($result.Words | ForEach-Object { @{text=$_.Text;confidence=$_.Confidence} })}
            Write-SpeechJson $state $WorkerOutput
        }
        $state.status=if($state.segments.Count){'TRANSCRIBED'}else{'NO_RECOGNITION'}; $state.stage='COMPLETE'
    } catch { $state.status='ERROR'; $state.error=$_.Exception.Message }
    finally { if ($null -ne $recognizer) { $recognizer.Dispose() }; Write-SpeechJson $state $WorkerOutput }
}

function Invoke-OfflineSpeech {
    $repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
    $scope=Join-Path $repo 'mandate/reports/2026-10-30-r12b-bcd-scope.json'
    Assert-BytesHash ([IO.File]::ReadAllBytes($scope)) 'b0ec96a587ac11f974348fb78fe1134cace129230a0d2181cc90083277f31a02' | Out-Null
    $packetPath=Join-Path $repo 'docs/qualification/beginner-r12b-expert-qa-final.json'
    Assert-BytesHash ([IO.File]::ReadAllBytes($packetPath)) '9dbbd4eac3f7922d3d4d53471f636681bfa7c57ada0cb0e9a7937bdba261cd21' | Out-Null
    $packet=Get-Content -LiteralPath $packetPath -Raw | ConvertFrom-Json
    $items=@($packet.items | Where-Object category -eq audio)
    if ($packet.items.Count -ne 82 -or $items.Count -ne 24 -or @($items.id | Sort-Object -Unique).Count -ne 24) { throw 'GUARD: expected exact82/24 unique packet' }
    foreach($bundle in $packet.sourceBundles) { Assert-BytesHash ([IO.File]::ReadAllBytes((Join-Path $repo $bundle.sourcePath))) $bundle.sourceSha256 | Out-Null }
    foreach($item in $items) {
        if ($item.id -cnotmatch '^mg0[12]-l[1-4]-audio-[abc123]$') { throw 'GUARD: invalid item ID' }
        Assert-BytesHash ([IO.File]::ReadAllBytes($item.context.path)) $item.context.sha256 | Out-Null
        $scriptHash=Assert-BytesHash ([Text.Encoding]::UTF8.GetBytes($item.context.script)) $item.context.scriptSha256
        if ($scriptHash -ne $item.context.scriptSha256) { throw 'GUARD: script binding' }
    }
    foreach($sub in @('asr','logs','artifacts')) { $probe="$script:SpeechRuntime/$sub/probe"; Assert-SpeechOutputPath $probe; [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($probe)) | Out-Null }
    $enginePaths=@('C:/Windows/System32/Speech/Engines/SR/spsreng.dll','C:/Windows/System32/Speech/Engines/SR/spsrx.dll','C:/Windows/System32/Speech/Common/sapi.dll','C:/ffmpeg/bin/ffmpeg.exe')+@(Get-ChildItem 'C:/Windows/Speech/Engines/SR/en-US' -File | ForEach-Object FullName)
    $engines=@($enginePaths | ForEach-Object { $f=Get-Item -LiteralPath $_; @{path=$f.FullName;bytes=$f.Length;sha256=(Get-FileHash -LiteralPath $_).Hash.ToLowerInvariant()} })
    $results=@()
    foreach($item in $items) {
        $id=$item.id; $derived="$script:SpeechRuntime/asr/$id.16k.wav"; $trace=New-SpeechTracePath $id
        Assert-SpeechOutputPath $derived; Assert-SpeechOutputPath $trace
        $pcm=Read-PcmWave ([IO.File]::ReadAllBytes($item.context.path))
        & 'C:/ffmpeg/bin/ffmpeg.exe' -nostdin -v error -y -i $item.context.path -ac 1 -ar 16000 -c:a pcm_s16le $derived
        if ($LASTEXITCODE -ne 0) { throw "GUARD: ffmpeg conversion failed: $id" }
        $derivedPcm=Read-PcmWave ([IO.File]::ReadAllBytes($derived))
        $info=[Diagnostics.ProcessStartInfo]::new('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe')
        $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
        foreach($arg in @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-WorkerInput',$derived,'-WorkerOutput',$trace)) { $info.ArgumentList.Add($arg) }
        $info.Environment.Clear(); $info.Environment['SystemRoot']='C:/Windows'; $info.Environment['WINDIR']='C:/Windows'; $info.Environment['TEMP']="$script:SpeechRuntime/asr"; $info.Environment['TMP']="$script:SpeechRuntime/asr"
        $started=[DateTime]::UtcNow; $watch=[Diagnostics.Stopwatch]::StartNew(); $process=[Diagnostics.Process]::Start($info)
        $stdout=$process.StandardOutput.ReadToEndAsync(); $stderr=$process.StandardError.ReadToEndAsync()
        $completed=$process.WaitForExit($TimeoutSeconds*1000)
        if (-not $completed) { $process.Kill($true); $process.WaitForExit() }
        $watch.Stop()
        $traceId=[IO.Path]::GetFileNameWithoutExtension($trace)
        $outLog="$script:SpeechRuntime/logs/$traceId.stdout.txt"; $errLog="$script:SpeechRuntime/logs/$traceId.stderr.txt"
        Assert-SpeechOutputPath $outLog; Assert-SpeechOutputPath $errLog
        [IO.File]::WriteAllText($outLog,$stdout.GetAwaiter().GetResult()); [IO.File]::WriteAllText($errLog,$stderr.GetAwaiter().GetResult())
        $state=Read-SpeechWorkerResult $trace $completed $process.ExitCode ((Get-FileHash -LiteralPath $derived -Algorithm SHA256).Hash.ToLowerInvariant())
        $transcript=if($state){(@($state.segments | ForEach-Object text) -join ' ')}else{''}
        $row=[ordered]@{id=$id;sourcePath=$item.context.sourcePath;sourceSha256=$item.context.sourceSha256;bundleSha256=$item.context.reviewedBundleSha256;audioPath=$item.context.path;audioSha256=$item.context.sha256;script=$item.context.script;scriptSha256=$item.context.scriptSha256;waveform=$pcm;derivedPath=$derived;derivedSha256=(Get-FileHash -LiteralPath $derived).Hash.ToLowerInvariant();derivedWaveform=$derivedPcm;startedAt=$started.ToString('o');elapsedSeconds=$watch.Elapsed.TotalSeconds;timeoutSeconds=$TimeoutSeconds;status=if(-not $completed){'TIMEOUT'}elseif($state){$state.status}else{'CHILD_FAILED'};exitCode=$process.ExitCode;worker=$state;transcript=$transcript;alignment=if($transcript){Compare-Script $item.context.script $transcript}else{$null};tracePath=$trace;stdoutPath=$outLog;stderrPath=$errLog;phoneticDisposition='NEEDS_EVIDENCE';humanDisposition=$null}
        $results+=[pscustomobject]$row
        Write-Output "$id $($row.status) stage=$($state.stage) $([Math]::Round($watch.Elapsed.TotalSeconds,2))s"
        $process.Dispose()
    }
    $report=[ordered]@{schemaVersion='worklingo-offline-speech/1';mission='WORKLINGO-R12B-BCD-20261030';mandate='MND-20261030-005';reviewerId='WORKLINGO-AI-REVIEWER-001';authorType='AI';createdAt=[DateTime]::UtcNow.ToString('o');packetSha256=(Get-FileHash -LiteralPath $packetPath).Hash.ToLowerInvariant();engine='Windows Microsoft Speech Recognizer 8.0 en-US';recognizerId='MS-1033-80-DESK';grammar='Unconstrained DictationGrammar, no expected-script hints';engineAndModelFiles=$engines;attempts=$results.Count;transcribed=@($results | Where-Object status -eq TRANSCRIBED).Count;timeouts=@($results | Where-Object status -eq TIMEOUT).Count;humanExpertVerified=0;phoneticVerified=0;paidRequests=0;recordingMutations=0;limitations=@('ASR agreement cannot establish human phonetic verification, pronunciation accuracy, noise quality or learner intelligibility.','ASR mismatches are candidates for audition, not confirmed source defects.','Windows built-in recognizer may depend on local profile state; no profile or credential files inspected.');items=$results}
    $report.errors=@($results | Where-Object status -eq ERROR).Count
    $report.itemsWithTranscript=@($results | Where-Object { $_.transcript }).Count
    $report.exactNormalizedMatches=@($results | Where-Object { $_.alignment -and $_.alignment.distance -eq 0 }).Count
    $report.mismatchCandidates=@($results | Where-Object { $_.alignment -and $_.alignment.distance -gt 0 }).Count
    $report.timestampLimit='System.Speech segment audio positions are segment-local observations; they are not forced alignment against the full recording.'
    foreach($r in $results) {
        foreach($kind in @('trace','stdout','stderr')) {
            $path=$r."${kind}Path"
            $r | Add-Member -NotePropertyName "${kind}Sha256" -NotePropertyValue $(if(Test-Path -LiteralPath $path){(Get-FileHash -LiteralPath $path).Hash.ToLowerInvariant()}else{$null})
        }
    }
    $reportPath=Join-Path $repo 'docs/qualification/beginner-r12b-bcd-offline-speech.json'
    [IO.File]::WriteAllText($reportPath,($report|ConvertTo-Json -Depth 40),[Text.UTF8Encoding]::new($false))
    $lines=@('# Beginner R1.2b offline speech evidence','','MND-20261030-005; reviewer WORKLINGO-AI-REVIEWER-001 (AI).',"Actual attempts: $($report.attempts)/24; transcribed: $($report.transcribed); timeouts: $($report.timeouts). Human expert verification 0; phonetic verification 0. All 24 phonetic dispositions remain NEEDS_EVIDENCE.",'','Windows en-US MS-1033-80-DESK with unconstrained DictationGrammar; no script hints, microphone or cloud calls. Original WAVs remain unchanged. Derived PCM16 mono16k WAVs and per-item traces stay in approved private runtime. JSON binds each result to the exact script, source, bundle and original/derived audio SHA256 and pins engine/model files.','',"Per-child timeout: ${TimeoutSeconds}s; one process at a time, no retries. Child environment cleared and populated only with explicit Windows/temp paths. Adaptation is disabled before recognition; unsupported settings fail closed. Closed-set grammar is never used.",'','A timeout or recognition mismatch is not evidence of a defective recording. ASR cannot certify final consonants, stress, connected speech, noise, or intelligibility for Vietnamese adult beginners. Preserve the existing 82 reviewer decisions and obtain genuine independent auditory evidence.','','| Item | Status | Last stage | Transcript |','|---|---|---|---|')
    foreach($r in $results){$lines+="| $($r.id) | $($r.status) | $($r.worker.stage) | $($r.transcript.Replace('|','/')) |"}
    [IO.File]::WriteAllText((Join-Path $repo 'docs/qualification/beginner-r12b-bcd-offline-speech.md'),($lines -join "`n"),[Text.UTF8Encoding]::new($false))
}

if ($WorkerInput -or $WorkerOutput) { if (-not $WorkerInput -or -not $WorkerOutput) { throw 'GUARD: both worker paths required' }; Invoke-SpeechWorker }
elseif ($Run) { Invoke-OfflineSpeech }
