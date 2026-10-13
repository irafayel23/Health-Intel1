param(
    [string]$KeyPath = "$env:USERPROFILE\Downloads\health-intel-key.pem",
    [string]$KnownHostsPath = "$env:USERPROFILE\Downloads\health-intel-backups\verified_known_hosts",
    [string]$VmHostname = 'health-intel.eastasia.cloudapp.azure.com',
    [int]$LocalPort = 13306,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
if ($VmHostname -notmatch '^[a-z0-9.-]+$' -or $LocalPort -lt 1024 -or $LocalPort -gt 65535) { throw 'Invalid tunnel settings.' }
foreach ($taskPath in @($KeyPath,$KnownHostsPath)) {
    if ($taskPath -match '["\r\n]' -or -not (Test-Path -LiteralPath $taskPath -PathType Leaf)) { throw 'The existing SSH identity or verified host-key file is missing.' }
}
$taskStateDir = Join-Path $PSScriptRoot '.private'
[void][IO.Directory]::CreateDirectory($taskStateDir)
$taskStatePath = Join-Path $taskStateDir 'viewer-tunnel.json'
$taskSsh = (Get-Command ssh.exe -ErrorAction Stop).Source
$taskListener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
if ($taskListener) {
    if (-not (Test-Path -LiteralPath $taskStatePath)) { throw 'The local tunnel port is already occupied by another process.' }
    $taskState = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
    $taskExisting = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskState.pid)"
    if (-not $taskExisting -or $taskListener.OwningProcess -ne $taskState.pid -or $taskExisting.ExecutablePath -ne $taskSsh -or $taskExisting.CommandLine -notlike "*127.0.0.1:${LocalPort}:127.0.0.1:3306*" -or $taskExisting.CommandLine -notlike "*azureuser@$VmHostname*") {
        throw 'The local port is occupied by a process other than this database tunnel.'
    }
    Write-Output 'The private Azure database tunnel is already running.'
} else {
    $taskKnownHosts = $KnownHostsPath.Replace('\','/')
    $taskArguments = '-N -T -L 127.0.0.1:' + $LocalPort + ':127.0.0.1:3306 -i "' + $KeyPath + '" -o "UserKnownHostsFile=\"' + $taskKnownHosts + '\"" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 azureuser@' + $VmHostname
    $taskProcess = Start-Process -FilePath $taskSsh -ArgumentList $taskArguments -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskStateDir 'viewer-ssh.log') -RedirectStandardError (Join-Path $taskStateDir 'viewer-ssh-error.log') -PassThru
    $taskReady = $false
    for ($taskTry=0;$taskTry -lt 40;$taskTry++) {
        if ($taskProcess.HasExited) { break }
        if (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue) { $taskReady=$true;break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $taskReady) {
        if (-not $taskProcess.HasExited) { Stop-Process -Id $taskProcess.Id }
        throw 'SSH could not connect. Check that the VM is running and SSH allows this PC; access was not widened.'
    }
    @{pid=$taskProcess.Id;hostname=$VmHostname;localAddress='127.0.0.1';localPort=$LocalPort;started=(Get-Date).ToString('o');active=$true} | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath
    Write-Output 'Private Azure database tunnel started on this PC only.'
}
if (-not $NoBrowser) { Start-Process 'http://localhost/phpmyadmin/index.php?server=2&db=health_intel' }
