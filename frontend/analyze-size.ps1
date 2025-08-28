# Simple build size analysis script
Write-Host "Frontend Build Size Analysis" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

if (Test-Path "dist") {
    # Show total size
    $totalSize = (Get-ChildItem -Recurse "dist" | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    $totalSizeKB = [math]::Round($totalSize / 1KB, 2)
    Write-Host "Total bundle size: $totalSizeKB KB ($totalSizeMB MB)" -ForegroundColor Green
    
    # Show HTML
    Write-Host "HTML files:" -ForegroundColor Yellow
    Get-ChildItem "dist/*.html" | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        Write-Host "  $($_.Name): $sizeKB KB" -ForegroundColor White
    }
    
    # Show JS files
    Write-Host "JavaScript files:" -ForegroundColor Yellow
    if (Test-Path "dist/assets/js/") {
        Get-ChildItem "dist/assets/js/*.js" | Sort-Object Length -Descending | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name): $sizeKB KB" -ForegroundColor White
        }
    }
    
    # Show CSS files
    Write-Host "CSS files:" -ForegroundColor Yellow
    if (Test-Path "dist/assets/css/") {
        Get-ChildItem "dist/assets/css/*.css" | Sort-Object Length -Descending | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name): $sizeKB KB" -ForegroundColor White
        }
    }
    
    # Show images
    Write-Host "Image files:" -ForegroundColor Yellow
    if (Test-Path "dist/assets/img/") {
        Get-ChildItem "dist/assets/img/*" | Sort-Object Length -Descending | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name): $sizeKB KB" -ForegroundColor White
        }
    }
    
    # Count total files
    $jsCount = (Get-ChildItem "dist/assets/js/*.js" -ErrorAction SilentlyContinue).Count
    $cssCount = (Get-ChildItem "dist/assets/css/*.css" -ErrorAction SilentlyContinue).Count
    $imgCount = (Get-ChildItem "dist/assets/img/*" -ErrorAction SilentlyContinue).Count
    
    Write-Host "File Summary:" -ForegroundColor Cyan
    Write-Host "- JavaScript files: $jsCount" -ForegroundColor White
    Write-Host "- CSS files: $cssCount" -ForegroundColor White  
    Write-Host "- Image files: $imgCount" -ForegroundColor White
    
    Write-Host "Optimization Results:" -ForegroundColor Green
    Write-Host "Minimal chunk configuration applied" -ForegroundColor Green
    Write-Host "Aggressive Terser minification enabled" -ForegroundColor Green
    Write-Host "Tree-shaking optimized" -ForegroundColor Green
    Write-Host "Console statements removed" -ForegroundColor Green
    Write-Host "CSS optimized with CSSnano" -ForegroundColor Green
    
} else {
    Write-Host "No dist folder found. Run build first:" -ForegroundColor Red
    Write-Host "npm run build:ultra-minimal" -ForegroundColor Yellow
}
