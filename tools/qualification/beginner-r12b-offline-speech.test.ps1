$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'beginner-r12b-offline-speech.ps1'
if (Test-Path $runner) { . $runner }
$script:passed = 0
$script:failed = 0
function Check($name, [scriptblock]$body) {
    try { & $body; $script:passed++; Write-Output "PASS $name" }
    catch { $script:failed++; Write-Output "FAIL $name : $($_.Exception.Message)" }
}
function Reject([scriptblock]$body) {
    $rejected = $false
    try { & $body | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'GUARD:') { throw }
        $rejected = $true
    }
    if (-not $rejected) { throw 'Expected rejection' }
}
# These literal PCM bytes describe one 16-bit mono sample at 24kHz.
[byte[]]$wave = 82,73,70,70,38,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,192,93,0,0,128,187,0,0,2,0,16,0,100,97,116,97,2,0,0,0,0,0
Check 'PCM parser accepts valid RIFF with exact duration' {
    $r = Read-PcmWave $wave
    if ($r.sampleRate -ne 24000 -or $r.sampleCount -ne 1 -or $r.clippedSamples -ne 0) { throw 'Wrong PCM measurements' }
}
Check 'PCM parser rejects truncated data rather than measuring it' {
    Reject { Read-PcmWave $wave[0..44] }
}
Check 'PCM parser rejects bytes outside complete declared chunks' {
    [byte[]]$bad = $wave + 123
    $bad[4] = 39
    Reject { Read-PcmWave $bad }
}
Check 'PCM parser rejects non-PCM encoding' {
    $bad = $wave.Clone(); $bad[20] = 3
    Reject { Read-PcmWave $bad }
}
Check 'Hash guard rejects changed recording' {
    Assert-BytesHash ([byte[]](97,98,99)) 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    Reject { Assert-BytesHash ([byte[]](97,98,100)) 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' }
}
Check 'Alignment preserves omitted and substituted words' {
    $r = Compare-Script 'Hello. Two books, please.' 'hello two bags'
    if ($r.distance -ne 2 -or $r.referenceWords -ne 4 -or $r.wer -ne 0.5) { throw 'Expected two errors in four reference words' }
}
Check 'Alignment ignores case and punctuation only' {
    $r = Compare-Script 'Hello, E, D.' 'HELLO E D'
    if ($r.distance -ne 0) { throw 'Formatting mismatch' }
    if ((Compare-Script 'I am Sam' 'Sam').distance -ne 2) { throw 'Missing words concealed' }
}
Check 'Output guard rejects traversal and sibling-prefix paths' {
    Assert-SpeechOutputPath 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030/asr/a.json'
    Reject { Assert-SpeechOutputPath 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030/asr/../../outside.json' }
    Reject { Assert-SpeechOutputPath 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030/asr-other/a.json' }
}
Check 'Trace names are unique to an attempt and stale child success cannot override failure' {
    $a = New-SpeechTracePath 'mg01-l1-audio-a'
    $b = New-SpeechTracePath 'mg01-l1-audio-a'
    if ($a -eq $b) { throw 'Trace path reused' }
    $p='C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030/artifacts/stale-trace-test.json'
    Write-SpeechJson @{status='TRANSCRIBED';inputSha256=('a'*64);segments=@(@{text='stale'})} $p
    try {
        $r=Read-SpeechWorkerResult $p $true 1 ('a'*64)
        if ($r.status -ne 'CHILD_FAILED' -or $r.segments.Count -ne 0) { throw 'Stale success accepted after child failure' }
        $r=Read-SpeechWorkerResult $p $true 0 ('b'*64)
        if ($r.status -ne 'CHILD_FAILED' -or $r.segments.Count -ne 0) { throw 'Wrong input receipt accepted' }
    } finally { Remove-Item -LiteralPath $p }
}
Write-Output "RESULT $script:passed passed; $script:failed failed"
if ($script:failed) { exit 1 }
