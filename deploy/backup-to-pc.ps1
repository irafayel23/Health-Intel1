param(
    [Parameter(Mandatory=$true)][string]$KeyPath,
    [Parameter(Mandatory=$true)][string]$BackupDirectory,
    [string]$VmHostname = 'health-intel.eastasia.cloudapp.azure.com'
)
$ErrorActionPreference = 'Stop'
$BackupDirectory = [IO.Path]::GetFullPath($BackupDirectory)
if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) { throw 'SSH key is missing.' }
if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) { throw 'Backup folder has not been initialized.' }
if ($VmHostname -notmatch '^[a-z0-9.-]+$') { throw 'Invalid VM hostname.' }
$taskMutex = New-Object Threading.Mutex($false, 'Local\HealthIntelPcBackup')
if (-not $taskMutex.WaitOne(0)) { $taskMutex.Dispose(); exit 0 }
$taskProcess = $null
$taskStarted = $false
$taskPartial = Join-Path $BackupDirectory ('health-intel-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N') + '.zip.partial')
$taskLog = Join-Path $BackupDirectory 'backup-status.json'
try {
    # DPAPI: encrypted credential can be read only by this Windows user on this PC.
    $taskSecretFile = Join-Path $BackupDirectory 'encryption-password.dpapi'
    $taskSecure = (Get-Content -LiteralPath $taskSecretFile -Raw).Trim() | ConvertTo-SecureString
    $taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
    try { $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
    $taskSsh = (Get-Command ssh.exe -ErrorAction Stop).Source
    $taskInfo = New-Object Diagnostics.ProcessStartInfo
    $taskInfo.FileName = $taskSsh
    # Paths with quotes/newlines are rejected; spaces are preserved by explicit quoting.
    if ($KeyPath -match '["\r\n]') { throw 'Unsupported SSH key path.' }
    $taskKnownHosts = Join-Path $BackupDirectory 'verified_known_hosts'
    if (-not (Test-Path -LiteralPath $taskKnownHosts -PathType Leaf) -or $taskKnownHosts -match '["\r\n]') { throw 'Verified SSH host-key file is missing or invalid.' }
    $taskKnownHosts = $taskKnownHosts.Replace('\', '/')
    $taskInfo.Arguments = '-i "' + $KeyPath + '" -o "UserKnownHostsFile=\"' + $taskKnownHosts + '\"" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 azureuser@' + $VmHostname + ' "sudo -n /usr/local/bin/node /opt/health-intel/server/scripts/backup-to-pc.js"'
    $taskInfo.UseShellExecute = $false; $taskInfo.CreateNoWindow = $true
    $taskInfo.RedirectStandardInput = $true; $taskInfo.RedirectStandardOutput = $true; $taskInfo.RedirectStandardError = $true
    $taskProcess = New-Object Diagnostics.Process
    $taskProcess.StartInfo = $taskInfo
    [void]$taskProcess.Start()
    $taskStarted = $true
    $taskErrors = $taskProcess.StandardError.ReadToEndAsync()
    $taskProcess.StandardInput.WriteLine((@{password=$taskPassword} | ConvertTo-Json -Compress))
    $taskProcess.StandardInput.Close(); $taskPassword = $null
    $taskOutput = [IO.File]::Create($taskPartial)
    try {
        $taskCopy = $taskProcess.StandardOutput.BaseStream.CopyToAsync($taskOutput)
        if (-not $taskCopy.Wait(240000)) { $taskProcess.Kill(); throw 'Backup transfer timed out.' }
    } finally { $taskOutput.Dispose() }
    if (-not $taskProcess.WaitForExit(15000)) { $taskProcess.Kill(); throw 'Backup process did not finish.' }
    if ($taskProcess.ExitCode -ne 0) { throw 'SSH or database backup failed. Verify connectivity, host key and remote setup.' }
    $taskMetadataLine = ($taskErrors.Result.Trim() -split '\r?\n')[-1]
    $taskMetadata = $taskMetadataLine | ConvertFrom-Json
    if ($taskMetadata.sha256 -notmatch '^[a-f0-9]{64}$' -or (Get-Item -LiteralPath $taskPartial).Length -ne $taskMetadata.bytes -or $taskMetadata.bytes -lt 22) { throw 'Backup length verification failed.' }
    $taskHash = (Get-FileHash -LiteralPath $taskPartial -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($taskHash -ne $taskMetadata.sha256) { throw 'Backup integrity verification failed.' }
    $taskFinal = $taskPartial.Replace('.zip.partial', '.zip')
    Move-Item -LiteralPath $taskPartial -Destination $taskFinal
    @{last_attempt=(Get-Date).ToString('o');success=$true;file=$taskFinal;sha256=$taskHash;bytes=$taskMetadata.bytes} | ConvertTo-Json | Set-Content -LiteralPath $taskLog
} catch {
    @{last_attempt=(Get-Date).ToString('o');success=$false;error=$_.Exception.Message} | ConvertTo-Json | Set-Content -LiteralPath $taskLog
    if (Test-Path -LiteralPath $taskPartial) { Remove-Item -LiteralPath $taskPartial }
    throw
} finally {
    if ($taskProcess) { if ($taskStarted -and -not $taskProcess.HasExited) { $taskProcess.Kill() }; $taskProcess.Dispose() }
    $taskMutex.ReleaseMutex(); $taskMutex.Dispose()
}
