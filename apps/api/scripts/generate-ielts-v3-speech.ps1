param([Parameter(Mandatory=$true)][string]$InputJson, [Parameter(Mandatory=$true)][string]$OutputWave, [int]$Rate=0)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$segments=Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $format=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $speaker.SetOutputToWaveFile($OutputWave,$format)
  $speaker.Rate=$Rate
  foreach ($segment in $segments) {
    $speaker.SelectVoice($segment.voice)
    # Names and gender metadata select voices; they are never spoken labels.
    $speaker.Speak($segment.text)
  }
} finally { $speaker.Dispose() }
