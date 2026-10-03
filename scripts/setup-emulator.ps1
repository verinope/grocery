$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $workspaceRoot '.android-tools'
$env:JAVA_HOME = Join-Path $toolsRoot 'jdk'
$env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
$env:ANDROID_USER_HOME = Join-Path $toolsRoot 'android-user'
$env:ANDROID_AVD_HOME = Join-Path $toolsRoot 'avd'
New-Item -ItemType Directory -Force -Path $env:ANDROID_AVD_HOME | Out-Null
& (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest/bin/sdkmanager.bat') "--sdk_root=$env:ANDROID_HOME" 'emulator' 'system-images;android-35;google_apis;x86_64'
if ($LASTEXITCODE -ne 0) { throw 'Emulator package install failed.' }
if (!(Test-Path (Join-Path $env:ANDROID_AVD_HOME 'BelanjaTest.ini'))) {
  'no' | & (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest/bin/avdmanager.bat') create avd --name BelanjaTest --package 'system-images;android-35;google_apis;x86_64' --path (Join-Path $env:ANDROID_AVD_HOME 'BelanjaTest.avd') --device 'pixel_6'
  if ($LASTEXITCODE -ne 0) { throw 'Emulator configuration failed.' }
}
Write-Output 'Headless Android test device ready.'
