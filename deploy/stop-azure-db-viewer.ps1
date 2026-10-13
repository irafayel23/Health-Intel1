$ErrorActionPreference = 'Stop'
$taskStatePath = Join-Path $PSScriptRoot '.private/viewer-tunnel.json'
if (-not (Test-Path -LiteralPath $taskStatePath)) { Write-Output 'No database viewer tunnel has been started.'; exit 0 }
$taskState = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskState.pid)"
if ($taskProcess) {
    $taskSsh = (Get-Command ssh.exe).Source
    if ($taskProcess.ExecutablePath -ne $taskSsh -or $taskProcess.CommandLine -notlike "*127.0.0.1:$($taskState.localPort):127.0.0.1:3306*" -or $taskProcess.CommandLine -notlike "*azureuser@$($taskState.hostname)*") {
        throw 'The saved process no longer matches this database tunnel; nothing was stopped.'
    }
    Stop-Process -Id $taskState.pid
}
$taskState.active=$false
$taskState | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath
Write-Output 'The local database viewer connection is stopped. The Azure website remains online.'
