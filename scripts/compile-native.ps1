$ErrorActionPreference = 'Stop'
$buildAlias = if ($env:RP_BUILD_ALIAS) { $env:RP_BUILD_ALIAS } else { Join-Path $env:USERPROFILE '.cache\rphub-local-build' }
$java = (Get-ChildItem "$buildAlias\.tools\java" -Directory | Select-Object -First 1).FullName
$javaExe = Join-Path $java 'bin\java.exe'
$classes = "$buildAlias\.tools\native-classes"
$dex = "$buildAlias\.tools\native-dex"
New-Item -ItemType Directory -Force -Path $classes, $dex | Out-Null
$sources = @(Get-ChildItem "$buildAlias\native" -Filter '*.java' -Recurse | ForEach-Object FullName)

# [2.9.044] 两个坑一起绕开：
#   1) ecj / D8 把诊断写进 stderr（多半只是 deprecation warning）。PowerShell 5.1 会把它包成
#      NativeCommandError，配合 $ErrorActionPreference='Stop' 直接打断构建，而编译其实成功。
#      2> file 这种壳层重定向在 5.1 里救不了，只能拿到 .NET 层重定向。
#   2) Start-Process 在环境变量出现 HTTPS_PROXY / https_proxy 这类仅有大小写差异的重复项时
#      会抛「字典中的关键字已添加」—— 这台机器上就会撞上。改用 System.Diagnostics.Process，
#      子进程直接继承父进程环境块，不重建字典，也就不会撞。
function Invoke-Java {
    param([string]$Exe, [string[]]$ArgList, [string]$LogPath)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = (($ArgList | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    $out = $proc.StandardOutput.ReadToEnd()
    $err = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    ($out + "`n" + $err) | Set-Content -LiteralPath $LogPath -Encoding UTF8
    return $proc.ExitCode
}

$ecjArgs = @('-jar', "$buildAlias\.tools\ecj.jar", '-encoding', 'UTF-8', '-source', '8', '-target', '8',
    '-classpath', "$buildAlias\.tools\android.jar", '-d', $classes) + $sources
$code = Invoke-Java -Exe $javaExe -ArgList $ecjArgs -LogPath "$buildAlias\.tools\ecj.log"
if ($code -ne 0) {
    Get-Content -LiteralPath "$buildAlias\.tools\ecj.log" -Encoding UTF8 | Write-Host
    throw 'Native Java compilation failed.'
}

$classFiles = @(Get-ChildItem $classes -Filter '*.class' -Recurse | ForEach-Object FullName)
if ($classFiles.Count -eq 0) { throw 'Native Java compilation produced no classes.' }
$dexArgs = @('-cp', "$buildAlias\.tools\r8.jar", 'com.android.tools.r8.D8', '--lib', "$buildAlias\.tools\android.jar",
    '--min-api', '21', '--output', $dex) + $classFiles
$code = Invoke-Java -Exe $javaExe -ArgList $dexArgs -LogPath "$buildAlias\.tools\d8.log"
if ($code -ne 0) {
    Get-Content -LiteralPath "$buildAlias\.tools\d8.log" -Encoding UTF8 | Write-Host
    throw 'Native DEX compilation failed.'
}
