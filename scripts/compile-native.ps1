$ErrorActionPreference = 'Stop'
$buildAlias = if ($env:RP_BUILD_ALIAS) { $env:RP_BUILD_ALIAS } else { Join-Path $env:USERPROFILE '.cache\rphub-local-build' }
$java = (Get-ChildItem "$buildAlias\.tools\java" -Directory | Select-Object -First 1).FullName
$javaExe = Join-Path $java 'bin\java.exe'
$classes = "$buildAlias\.tools\native-classes"
$dex = "$buildAlias\.tools\native-dex"
New-Item -ItemType Directory -Force -Path $classes, $dex | Out-Null
$sources = @(Get-ChildItem "$buildAlias\native" -Filter '*.java' -Recurse | ForEach-Object FullName)
& $javaExe -jar "$buildAlias\.tools\ecj.jar" -encoding UTF-8 -source 8 -target 8 -classpath "$buildAlias\.tools\android.jar" -d $classes $sources
if ($LASTEXITCODE -ne 0) { throw 'Native Java compilation failed.' }
$classFiles = @(Get-ChildItem $classes -Filter '*.class' -Recurse | ForEach-Object FullName)
& $javaExe -cp "$buildAlias\.tools\r8.jar" com.android.tools.r8.D8 --lib "$buildAlias\.tools\android.jar" --min-api 21 --output $dex $classFiles
if ($LASTEXITCODE -ne 0) { throw 'Native DEX compilation failed.' }
