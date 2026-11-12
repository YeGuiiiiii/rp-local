param([string]$Version = '2.9.027')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$buildAlias = if ($env:RP_BUILD_ALIAS) { $env:RP_BUILD_ALIAS } else { Join-Path $env:USERPROFILE '.cache\rphub-local-build' }
if (!(Test-Path -LiteralPath $buildAlias)) {
    New-Item -ItemType Junction -Path $buildAlias -Target $projectRoot | Out-Null
}
$junction = Get-Item -LiteralPath $buildAlias
if ([IO.Path]::GetFullPath($junction.Target) -ne [IO.Path]::GetFullPath($projectRoot)) {
    throw 'Build junction points to another project.'
}
$java = (Get-ChildItem "$buildAlias\.tools\java" -Directory | Select-Object -First 1).FullName
$javaExe = Join-Path $java 'bin\java.exe'
$keytool = Join-Path $java 'bin\keytool.exe'
$signingDir = Join-Path $buildAlias '.signing'
New-Item -ItemType Directory -Force -Path $signingDir | Out-Null
$configPath = Join-Path $signingDir 'local.json'
if (!(Test-Path -LiteralPath $configPath)) {
    $password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    @{ password = $password; alias = 'rplocal' } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
}
$signing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$env:RP_LOCAL_KEY_PASSWORD = $signing.password
$keystore = Join-Path $signingDir 'rplocal.p12'
if (!(Test-Path -LiteralPath $keystore)) {
    & $keytool -genkeypair -storetype PKCS12 -keystore $keystore '-storepass:env' RP_LOCAL_KEY_PASSWORD '-keypass:env' RP_LOCAL_KEY_PASSWORD -alias $signing.alias -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=RP Local Personal Build'
    if ($LASTEXITCODE -ne 0) { throw 'Key generation failed.' }
}
& node "$PSScriptRoot\build-stream.cjs"
if ($LASTEXITCODE -ne 0) { throw 'Streaming import build failed.' }
& node "$PSScriptRoot\compile-ui.cjs"
if ($LASTEXITCODE -ne 0) { throw 'UI compilation failed.' }
& node "$PSScriptRoot\check-resources.mjs"
if ($LASTEXITCODE -ne 0) { throw 'Resource audit failed.' }
$stagedSite = [IO.Path]::GetFullPath("$projectRoot\android\assets\local-site")
$stagingRoot = [IO.Path]::GetFullPath("$projectRoot\android\assets") + [IO.Path]::DirectorySeparatorChar
if (!$stagedSite.StartsWith($stagingRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Generated asset directory is outside the build workspace.'
}
if (Test-Path -LiteralPath $stagedSite) { Remove-Item -LiteralPath $stagedSite -Recurse -Force }
Copy-Item -LiteralPath "$projectRoot\web" -Destination $stagedSite -Recurse
Copy-Item -LiteralPath "$projectRoot\reference\RP-Hub\LICENSE" -Destination "$projectRoot\android\assets\RP-Hub-LICENSE.txt" -Force
& "$PSScriptRoot\compile-native.ps1"
$unsigned = Join-Path $buildAlias ".tools\rp-local-$Version.apk"
& $javaExe '-Dfile.encoding=UTF-8' -jar "$buildAlias\.tools\apktool.jar" b -f "$buildAlias\android" -o $unsigned
if ($LASTEXITCODE -ne 0) { throw 'APK build failed.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
try {
    $obsolete = @($archive.Entries | Where-Object {
        $_.FullName.StartsWith('assets/') -and
        !($_.FullName.StartsWith('assets/local-site/') -or
          $_.FullName -eq 'assets/RP-Hub-LICENSE.txt' -or
          $_.FullName -eq 'assets/LUCIDE-LICENSE.txt' -or
          $_.FullName -eq 'assets/LOCAL-NOTICE.txt')
    })
    foreach ($entry in $obsolete) { $entry.Delete() }
    $old = $archive.GetEntry('classes2.dex')
    if ($old) { $old.Delete() }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, "$buildAlias\.tools\native-dex\classes.dex", 'classes2.dex') | Out-Null
} finally { $archive.Dispose() }
& $javaExe '-Dfile.encoding=UTF-8' -jar "$buildAlias\.tools\signer.jar" --apks $unsigned --ks $keystore --ksAlias $signing.alias --ksPass $signing.password --ksKeyPass $signing.password --overwrite
if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
$final = Join-Path $projectRoot "dist\RP-local-$Version.apk"
Copy-Item -LiteralPath $unsigned -Destination $final -Force
$hash = (Get-FileHash -LiteralPath $final -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  RP-local-$Version.apk" | Set-Content -LiteralPath "$projectRoot\dist\SHA256SUMS-$Version.txt" -Encoding ascii
Remove-Item Env:\RP_LOCAL_KEY_PASSWORD
Get-Item -LiteralPath $final | Select-Object FullName, Length
