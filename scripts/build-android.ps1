param([switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $workspaceRoot '.android-tools'
$env:JAVA_HOME = Join-Path $toolsRoot 'jdk'
$env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
$env:ANDROID_USER_HOME = Join-Path $toolsRoot 'android-user'
$env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle'
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
if (!(Test-Path (Join-Path $env:JAVA_HOME 'bin/java.exe'))) { throw 'Run scripts/setup-android.ps1 first.' }
New-Item -ItemType Directory -Force -Path (Join-Path $toolsRoot 'signing') | Out-Null
$debugKey = Join-Path $toolsRoot 'signing/debug.keystore'
if (!(Test-Path $debugKey)) {
  & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -genkeypair -keystore $debugKey -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Android,C=US'
  if ($LASTEXITCODE -ne 0) { throw 'Debug signing key generation failed.' }
}
$sdkPathForProperties = $env:ANDROID_HOME.Replace('\', '/')
"sdk.dir=$sdkPathForProperties" | Set-Content (Join-Path $workspaceRoot 'android/local.properties')
Push-Location $workspaceRoot
try {
  if (!$SkipWebBuild) {
    node scripts/build.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & ./node_modules/.bin/cap.cmd sync android
    if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
  }
  Push-Location (Join-Path $workspaceRoot 'android')
  try {
    & ./gradlew.bat --no-daemon --console=plain assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'APK build failed.' }
  } finally { Pop-Location }
  $artifactDirectory = Join-Path $workspaceRoot 'artifacts'
  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  $apk = Join-Path $artifactDirectory 'Belanja-0.1.0-debug.apk'
  Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination $apk
  & (Join-Path $env:ANDROID_HOME 'build-tools/36.0.0/apksigner.bat') verify --verbose --print-certs $apk
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  $hash = (Get-FileHash $apk -Algorithm SHA256).Hash.ToLower()
  "$hash  Belanja-0.1.0-debug.apk" | Set-Content (Join-Path $artifactDirectory 'Belanja-0.1.0-debug.apk.sha256')
  if ($env:BELANJA_PYTHON) {
    & $env:BELANJA_PYTHON scripts/verify-apk.py
    if ($LASTEXITCODE -ne 0) { throw 'APK bundled assets verification failed.' }
  }
  Write-Output "Installable APK ready: $apk"
} finally { Pop-Location }
