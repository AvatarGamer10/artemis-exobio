# Genera el icono de Artemis: hoja verde sobre anillos de escáner naranjas,
# fondo oscuro redondeado. Produce resources/icon.png y build/icon.ico.
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fondo: cuadrado redondeado oscuro
$bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 58; $w = $size
$bgPath.AddArc(0, 0, $r*2, $r*2, 180, 90)
$bgPath.AddArc($w-$r*2, 0, $r*2, $r*2, 270, 90)
$bgPath.AddArc($w-$r*2, $w-$r*2, $r*2, $r*2, 0, 90)
$bgPath.AddArc(0, $w-$r*2, $r*2, $r*2, 90, 90)
$bgPath.CloseFigure()
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point(0,$size)),
  [System.Drawing.Color]::FromArgb(255,26,15,6), [System.Drawing.Color]::FromArgb(255,10,6,3))
$g.FillPath($bgBrush, $bgPath)

# Anillos de escáner (arcos naranjas abriéndose hacia arriba)
$cx = 128; $cy = 168
foreach ($rad in @(46, 74, 102)) {
  $alpha = [int](255 - ($rad - 46) * 1.4)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($alpha, 255, 125, 26)), 13
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawArc($pen, $cx - $rad, $cy - $rad, $rad*2, $rad*2, 200, 140)
  $pen.Dispose()
}

# Hoja verde en el centro (dos curvas de Bézier cerradas)
$leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
$leaf.AddBezier(128, 190, 88, 160, 84, 110, 128, 78)
$leaf.AddBezier(128, 78, 172, 110, 168, 160, 128, 190)
$leaf.CloseFigure()
$leafBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 125, 255, 138))
$g.FillPath($leafBrush, $leaf)
# Nervio central
$veinPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 16, 60, 24)), 6
$veinPen.StartCap = 'Round'; $veinPen.EndCap = 'Round'
$g.DrawLine($veinPen, 128, 92, 128, 182)

$g.Dispose()

New-Item -ItemType Directory -Force "$PSScriptRoot\..\resources", "$PSScriptRoot\..\build" | Out-Null
$pngPath = Resolve-Path "$PSScriptRoot\.." | ForEach-Object { Join-Path $_ "resources\icon.png" }
$icoPath = Resolve-Path "$PSScriptRoot\.." | ForEach-Object { Join-Path $_ "build\icon.ico" }
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# ICO con la PNG embebida (formato Vista+: ICONDIR + entrada + blob PNG)
$png = [IO.File]::ReadAllBytes($pngPath)
$ms = New-Object IO.MemoryStream
$bw = New-Object IO.BinaryWriter($ms)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)   # reserved, type=icon, count=1
$bw.Write([byte]0); $bw.Write([byte]0)                              # 256x256 se codifica como 0
$bw.Write([byte]0); $bw.Write([byte]0)                              # paleta, reserved
$bw.Write([uint16]1); $bw.Write([uint16]32)                         # planes, bpp
$bw.Write([uint32]$png.Length); $bw.Write([uint32]22)               # tamaño, offset
$bw.Write($png)
[IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose()

Write-Output "PNG: $pngPath"
Write-Output "ICO: $icoPath"
