param([Parameter(Mandatory=$true)][string]$InputJson, [Parameter(Mandatory=$true)][string]$OutputWave)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$turns = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $speaker.SetOutputToWaveFile($OutputWave, $format)
  $speaker.Rate = 0
  foreach ($turn in $turns) {
    $speaker.SelectVoice($turn.voice)
    $speaker.Speak($turn.text)
  }
} finally { $speaker.Dispose() }
