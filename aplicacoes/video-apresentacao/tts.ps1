# Vozes PROVISORIAS (voz pt-BR do Windows) para testar a mixagem. Saida: audios\provisorio\locutor_0N.wav
# Arquivo em ASCII de proposito (PowerShell 5.1 le UTF-8 sem BOM errado); a = [char]0xE3.
Add-Type -AssemblyName System.Speech
$dir = Join-Path $PSScriptRoot 'audios\provisorio'
New-Item -ItemType Directory -Force $dir | Out-Null
$a = [char]0xE3
$falas = @(
  'Senhoras e senhores... o craque do seu comercial!',
  'Direto do Comercial 360... GIRO!',
  "Velocidade de proposta: noventa e nove. Precis${a}o de funil: noventa e oito.",
  "Fechamento: cem. E ele n${a}o sai do seu time."
)
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
for ($i = 0; $i -lt $falas.Count; $i++) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try { $s.SelectVoiceByHints('NotSet', 'NotSet', 0, [Globalization.CultureInfo]'pt-BR') } catch {}
  $s.Rate = 3
  $s.SetOutputToWaveFile((Join-Path $dir ('locutor_{0:D2}.wav' -f ($i + 1))), $fmt)
  $s.Speak($falas[$i]); $s.Dispose()
}
Get-ChildItem $dir
