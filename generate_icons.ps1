Add-Type -AssemblyName System.Drawing

$src = "E:\my projects\job-geter\frontend-portal\public\traptip.png"

# Copy to destinations
Copy-Item $src "E:\my projects\job-geter\public\traptip.png" -Force
Copy-Item $src "E:\my projects\job-geter\backend-scraper\assets\traptip.png" -Force

$portalDir = "E:\my projects\job-geter\frontend-portal\public\portal"
if (-not (Test-Path $portalDir)) { New-Item -ItemType Directory -Path $portalDir -Force }
Copy-Item $src "$portalDir\traptip.png" -Force

$portalRoot = "E:\my projects\job-geter\frontend-portal\portal"
if (Test-Path $portalRoot) { Copy-Item $src "$portalRoot\traptip.png" -Force }

# Function to resize image nicely with high quality
function Resize-Image([string]$sourcePath, [string]$destPath, [int]$width, [int]$height) {
    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
    $destBmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($srcImg, 0, 0, $width, $height)
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Output "Successfully generated $destPath ($width x $height)"
}

Resize-Image $src "E:\my projects\job-geter\frontend-portal\public\icon-512.png" 512 512
Resize-Image $src "E:\my projects\job-geter\frontend-portal\public\icon-192.png" 192 192
Resize-Image $src "E:\my projects\job-geter\frontend-portal\public\apple-touch-icon.png" 180 180
Resize-Image $src "E:\my projects\job-geter\frontend-portal\public\favicon-32x32.png" 32 32
Resize-Image $src "E:\my projects\job-geter\frontend-portal\public\favicon-16x16.png" 16 16

# Favicon ico from 32x32
$icoBmp = [System.Drawing.Bitmap]::FromFile("E:\my projects\job-geter\frontend-portal\public\favicon-32x32.png")
$iconHandle = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::Create("E:\my projects\job-geter\frontend-portal\public\favicon.ico")
$icon.Save($stream)
$stream.Close()
$icoBmp.Dispose()
Write-Output "Successfully generated favicon.ico"
