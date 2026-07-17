# Ensambla build/icon.ico (multi-tamaño: 16/32/48/256) a partir de los PNG de
# resources/, que se rasterizan desde resources/icon.svg (maestro, 256/48) y
# resources/icon-small.svg (variante simplificada para 32/16).
# Para regenerar los PNG: abrir los SVG en un navegador y exportar por canvas,
# o cualquier rasterizador SVG→PNG. Este script solo empaqueta el ICO.

$dir = Resolve-Path "$PSScriptRoot\.."
$pngs = @(
  (Join-Path $dir 'resources\icon-16.png'),
  (Join-Path $dir 'resources\icon-32.png'),
  (Join-Path $dir 'resources\icon-48.png'),
  (Join-Path $dir 'resources\icon.png')      # 256
)
$sizes = @(16, 32, 48, 0)                     # 256 se codifica como 0 en ICO

foreach ($p in $pngs) {
  if (-not (Test-Path $p)) { throw "Falta $p" }
}

$blobs = $pngs | ForEach-Object { ,[IO.File]::ReadAllBytes($_) }
$ms = New-Object IO.MemoryStream
$bw = New-Object IO.BinaryWriter($ms)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$blobs.Count)
$offset = 6 + 16 * $blobs.Count
for ($i = 0; $i -lt $blobs.Count; $i++) {
  $bw.Write([byte]$sizes[$i]); $bw.Write([byte]$sizes[$i])   # ancho, alto
  $bw.Write([byte]0); $bw.Write([byte]0)                      # paleta, reserved
  $bw.Write([uint16]1); $bw.Write([uint16]32)                 # planes, bpp
  $bw.Write([uint32]$blobs[$i].Length); $bw.Write([uint32]$offset)
  $offset += $blobs[$i].Length
}
foreach ($b in $blobs) { $bw.Write($b) }

New-Item -ItemType Directory -Force (Join-Path $dir 'build') | Out-Null
$icoPath = Join-Path $dir 'build\icon.ico'
[IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose()
Write-Output "ICO: $icoPath ($([math]::Round((Get-Item $icoPath).Length / 1KB, 1)) KB, $($blobs.Count) tamaños)"
