$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "D:\Projects\verax\docs\superpowers\audits\refinement-evidence"

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$shots = @(
  @{ name = "01-homepage-desktop-1440.png"; w = 1440; h = 900; url = "http://localhost:3000" },
  @{ name = "02-homepage-mobile-390.png"; w = 390; h = 844; url = "http://localhost:3000" },
  @{ name = "03-homepage-mobile-small-360.png"; w = 360; h = 800; url = "http://localhost:3000" },
  @{ name = "04-homepage-mobile-large-430.png"; w = 430; h = 932; url = "http://localhost:3000" },
  @{ name = "05-homepage-tablet-768.png"; w = 768; h = 1024; url = "http://localhost:3000" },
  @{ name = "05b-homepage-tablet-landscape-1024.png"; w = 1024; h = 768; url = "http://localhost:3000" },
  @{ name = "06-homepage-laptop-1366.png"; w = 1366; h = 768; url = "http://localhost:3000" },
  @{ name = "07-homepage-wide-1920.png"; w = 1920; h = 1080; url = "http://localhost:3000" },
  @{ name = "08-standar-editorial-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/standar-editorial" },
  @{ name = "09-about-verax-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/tentang" },
  @{ name = "10-desk-listing-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/desk/hukum-keadilan" },
  @{ name = "11-article-detail-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press" },
  @{ name = "12-article-detail-mobile-390.png"; w = 390; h = 844; url = "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press" },
  @{ name = "13-studio-login-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/studio/login" },
  @{ name = "13b-studio-login-mobile-390.png"; w = 390; h = 844; url = "http://localhost:3000/studio/login" },
  @{ name = "14-keluhan-form-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/keluhan" },
  @{ name = "14b-keluhan-form-mobile-390.png"; w = 390; h = 844; url = "http://localhost:3000/keluhan" },
  @{ name = "15-koreksi-log-1440.png"; w = 1440; h = 900; url = "http://localhost:3000/koreksi" },
  @{ name = "16-article-detail-wide-1920.png"; w = 1920; h = 1080; url = "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press" }
)

foreach ($s in $shots) {
  $target = Join-Path $outDir $s.name
  Write-Host "Capturing $($s.name) ($($s.w)x$($s.h))..."
  Start-Process -FilePath $chrome -ArgumentList "--headless=new --disable-gpu --screenshot=`"$target`" --window-size=$($s.w),$($s.h) `"$($s.url)`"" -Wait
  if (Test-Path $target) {
    Write-Host "[OK] $($s.name)"
  } else {
    Write-Host "[FAIL] $($s.name)"
  }
}
