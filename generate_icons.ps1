Add-Type -AssemblyName System.Drawing

function Draw-ZipZapLogo([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale factor based on size
    $scale = [float]$size / 100.0

    # 1. Background Rounded Rectangle
    $margin = 4.0 * $scale
    $bgSize = [float]$size - (2.0 * $margin)
    $radius = 24.0 * $scale
    $diameter = $radius * 2.0
    
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($margin, $margin, $diameter, $diameter, 180, 90)
    $path.AddArc(($margin + $bgSize - $diameter), $margin, $diameter, $diameter, 270, 90)
    $path.AddArc(($margin + $bgSize - $diameter), ($margin + $bgSize - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($margin, ($margin + $bgSize - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    # Linear Gradient for Background (#2563EB -> #4F46E5 -> #7C3AED)
    $pStart = [System.Drawing.PointF]::new($margin, $margin)
    $pEnd = [System.Drawing.PointF]::new(($margin + $bgSize), ($margin + $bgSize))
    $cStart = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    $cEnd = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($pStart, $pEnd, $cStart, $cEnd)
    $g.FillPath($brush, $path)

    # Subtle border highlight
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(100, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
    $g.DrawPath($borderPen, $path)

    # 2. Cyan Radar Ring Arc
    $radarPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(160, 56, 189, 248), [Math]::Max(1.5, 2.5 * $scale))
    $radarPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $g.DrawEllipse($radarPen, (14.0 * $scale), (14.0 * $scale), (72.0 * $scale), (72.0 * $scale))

    # 3. Bold Lightning Bolt (Zip / Zap ⚡)
    $points = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new((48.0 * $scale), (18.0 * $scale)),
        [System.Drawing.PointF]::new((74.0 * $scale), (18.0 * $scale)),
        [System.Drawing.PointF]::new((54.0 * $scale), (45.0 * $scale)),
        [System.Drawing.PointF]::new((76.0 * $scale), (45.0 * $scale)),
        [System.Drawing.PointF]::new((34.0 * $scale), (84.0 * $scale)),
        [System.Drawing.PointF]::new((46.0 * $scale), (53.0 * $scale)),
        [System.Drawing.PointF]::new((28.0 * $scale), (53.0 * $scale))
    )

    $boltPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $boltPath.AddPolygon($points)

    # Bolt Gradient: Bright Yellow (#FEF08A) to Orange (#F59E0B) to Electric Coral (#EF4444)
    $bpStart = [System.Drawing.PointF]::new((40.0 * $scale), (18.0 * $scale))
    $bpEnd = [System.Drawing.PointF]::new((40.0 * $scale), (84.0 * $scale))
    $bcStart = [System.Drawing.Color]::FromArgb(255, 254, 240, 138)
    $bcEnd = [System.Drawing.Color]::FromArgb(255, 239, 68, 68)
    $boltBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bpStart, $bpEnd, $bcStart, $bcEnd)
    $g.FillPath($boltBrush, $boltPath)

    # Bolt outer subtle white crisp outline
    $boltPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(240, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
    $g.DrawPath($boltPen, $boltPath)

    # 4. Energy Spark Dots
    $sparkBrush1 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 253, 224, 71))
    $g.FillEllipse($sparkBrush1, (74.0 * $scale), (24.0 * $scale), (6.0 * $scale), (6.0 * $scale))

    $sparkBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 56, 189, 248))
    $g.FillEllipse($sparkBrush2, (20.0 * $scale), (72.0 * $scale), (5.0 * $scale), (5.0 * $scale))

    # Ensure parent directory exists
    $parentDir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not [System.IO.Directory]::Exists($parentDir)) {
        [System.IO.Directory]::CreateDirectory($parentDir) | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Clean up
    $g.Dispose()
    $bmp.Dispose()
    $path.Dispose()
    $brush.Dispose()
    $borderPen.Dispose()
    $radarPen.Dispose()
    $boltPath.Dispose()
    $boltBrush.Dispose()
    $boltPen.Dispose()
    $sparkBrush1.Dispose()
    $sparkBrush2.Dispose()

    Write-Output "Successfully generated $outputPath ($size x $size)"
}

# Generate in backend-scraper/assets
Draw-ZipZapLogo 256 "E:\my projects\job-geter\backend-scraper\assets\zipzap_logo.png"

# Generate in frontend-portal/public
Draw-ZipZapLogo 512 "E:\my projects\job-geter\frontend-portal\public\icon-512.png"
Draw-ZipZapLogo 192 "E:\my projects\job-geter\frontend-portal\public\icon-192.png"
Draw-ZipZapLogo 180 "E:\my projects\job-geter\frontend-portal\public\apple-touch-icon.png"
Draw-ZipZapLogo 64  "E:\my projects\job-geter\frontend-portal\public\zipzap_logo.png"
Draw-ZipZapLogo 32  "E:\my projects\job-geter\frontend-portal\public\favicon-32x32.png"
Draw-ZipZapLogo 16  "E:\my projects\job-geter\frontend-portal\public\favicon-16x16.png"

# Also generate a multi-resolution favicon.ico
# To create standard ICO from 32x32 bitmap:
$icoBmp = [System.Drawing.Bitmap]::FromFile("E:\my projects\job-geter\frontend-portal\public\favicon-32x32.png")
$iconHandle = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::Create("E:\my projects\job-geter\frontend-portal\public\favicon.ico")
$icon.Save($stream)
$stream.Close()
$icoBmp.Dispose()
Write-Output "Successfully generated favicon.ico"
