$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspaceRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $workspaceRoot '.android-tools'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
$sdkArchive = Join-Path $toolsRoot 'commandlinetools.zip'
$sdkChecksum = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
$sdkManager = Join-Path $toolsRoot 'sdk/cmdline-tools/latest/bin/sdkmanager.bat'
if (!(Test-Path $sdkManager)) {
  Write-Output 'Downloading Android command-line tools from Google…'
  if (!(Test-Path $sdkArchive)) {
    Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkArchive
  }
  if ((Get-FileHash $sdkArchive -Algorithm SHA256).Hash.ToLower() -ne $sdkChecksum) { throw 'Android tools checksum mismatch.' }
  $sdkStaging = Join-Path $toolsRoot 'sdk-staging'
  Expand-Archive -LiteralPath $sdkArchive -DestinationPath $sdkStaging -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $toolsRoot 'sdk/cmdline-tools') | Out-Null
  $sdkSource = [IO.Path]::GetFullPath((Join-Path $sdkStaging 'cmdline-tools'))
  $sdkDestination = [IO.Path]::GetFullPath((Join-Path $toolsRoot 'sdk/cmdline-tools/latest'))
  if (!$sdkSource.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar) -or !$sdkDestination.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected tools path.' }
  Move-Item -LiteralPath $sdkSource -Destination $sdkDestination
}
$javaRoot = Join-Path $toolsRoot 'jdk'
if (!(Test-Path (Join-Path $javaRoot 'bin/java.exe'))) {
  Write-Output 'Downloading Temurin JDK 21 from Eclipse Adoptium…'
  $release = Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
  $package = $release[0].binary.package
  $javaArchive = Join-Path $toolsRoot 'jdk.zip'
  if (!(Test-Path $javaArchive)) { Invoke-WebRequest $package.link -OutFile $javaArchive }
  if ((Get-FileHash $javaArchive -Algorithm SHA256).Hash.ToLower() -ne $package.checksum) { throw 'JDK checksum mismatch.' }
  $javaStaging = Join-Path $toolsRoot 'jdk-staging'
  Expand-Archive -LiteralPath $javaArchive -DestinationPath $javaStaging -Force
  $javaSource = (Get-ChildItem -LiteralPath $javaStaging -Directory | Select-Object -First 1).FullName
  $javaDestination = [IO.Path]::GetFullPath($javaRoot)
  if (!$javaSource.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar) -or !$javaDestination.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected JDK path.' }
  Move-Item -LiteralPath $javaSource -Destination $javaDestination
  @{ version = $release[0].version.semver; url = $package.link; sha256 = $package.checksum } | ConvertTo-Json | Set-Content (Join-Path $toolsRoot 'jdk-release.json')
}
$env:JAVA_HOME = $javaRoot
$env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
$env:ANDROID_USER_HOME = Join-Path $toolsRoot 'android-user'
$env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle'
Write-Output 'Installing Android SDK platform 36, build tools, and device tools…'
1..100 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$env:ANDROID_HOME" --licenses *> (Join-Path $toolsRoot 'sdk-licenses.log')
if ($LASTEXITCODE -ne 0) { throw 'SDK license setup failed.' }
& $sdkManager "--sdk_root=$env:ANDROID_HOME" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'SDK package installation failed.' }
& (Join-Path $javaRoot 'bin/java.exe') -version
Write-Output 'Android build tools ready in the project directory.'
