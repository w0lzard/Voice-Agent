# generate-voice-samples.ps1
# Generates WAV voice samples using Windows built-in SAPI
# Run: powershell -ExecutionPolicy Bypass -File scripts/generate-voice-samples.ps1

Add-Type -AssemblyName System.Speech

$outDir = Join-Path $PSScriptRoot "..\public\audio"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# List all installed voices for reference
$tempSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$allVoices = $tempSynth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
$tempSynth.Dispose()

Write-Host "Installed voices:"
$allVoices | ForEach-Object { Write-Host "  [$($_.Gender)] $($_.Name)" }
Write-Host ""

# Pick best female / male voice available
$femaleVoice = ($allVoices | Where-Object { $_.Gender -eq "Female" } | Select-Object -First 1).Name
$maleVoice   = ($allVoices | Where-Object { $_.Gender -eq "Male"   } | Select-Object -First 1).Name

if (-not $femaleVoice) { $femaleVoice = $allVoices[0].Name }
if (-not $maleVoice)   { $maleVoice   = $allVoices[0].Name }

Write-Host "Using female voice : $femaleVoice"
Write-Host "Using male voice   : $maleVoice"
Write-Host ""

function Make-Sample($fileName, $voiceName, $rate, $text) {
    $path  = Join-Path $outDir $fileName
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try { $synth.SelectVoice($voiceName) } catch {}
    $synth.Rate = $rate
    $synth.SetOutputToWaveFile($path)
    $synth.Speak($text)
    $synth.SetOutputToDefaultAudioDevice()
    $synth.Dispose()
    Write-Host "Generated: $fileName  (voice: $voiceName)"
}

# Sarah — Professional female: neutral measured pace, calm authority
Make-Sample "sarah.wav" $femaleVoice  0 `
  "Hello. This is Sarah from VoiceAI. I am reaching out regarding a strategic opportunity that may be of interest to your organization. I would be glad to schedule a brief consultation at your convenience."

# Mark — Friendly male: fast, energetic, upbeat
Make-Sample "mark.wav"  $maleVoice    4 `
  "Hey! Great to connect with you! This is Mark from VoiceAI, and I have some genuinely exciting news I think you are going to love. Do you have just two minutes? I promise it will be worth it!"

# James — Sophisticated male: slow, deep, deliberate, formal
Make-Sample "james.wav" $maleVoice   -3 `
  "Good day. I am James, calling on behalf of VoiceAI. I wished to discuss a matter of considerable importance regarding your portfolio. I trust you find this moment suitable for a brief and productive discussion."

# Elena — Warm female: gentle, soft, patient pace
Make-Sample "elena.wav" $femaleVoice -1 `
  "Hello there. This is Elena from VoiceAI. I hope you are having a wonderful day. I just wanted to take a moment to personally reach out and make sure everything is going smoothly for you. I am here whenever you need me."

Write-Host ""
Write-Host "Done. Files saved to public/audio/"
