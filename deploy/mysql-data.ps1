param(
    [Parameter(Mandatory)][ValidateSet('Backup','Restore')][string]$Action,
    [Parameter(Mandatory)][ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_.-]*$')][string]$Container,
    [string]$BackupFile,
    [switch]$ConfirmProductionRestore
)
$ErrorActionPreference='Stop'
function Invoke-Docker { param([string[]]$Arguments)
    $previous=$ErrorActionPreference;$ErrorActionPreference='Continue'
    try { & docker.exe @Arguments; $code=$LASTEXITCODE } finally { $ErrorActionPreference=$previous }
    if($code -ne 0){throw "Docker falhou (codigo $code). Nao remova o banco antigo."}
}
$raw=@(Invoke-Docker -Arguments @('inspect',$Container)) -join "`n"
$info=@($raw | ConvertFrom-Json)[0]
if($info.Config.Labels.'com.docker.compose.service' -ne 'db'){throw 'O alvo nao e um servico db do Docker Compose.'}
$stamp=(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N')
$remote='/tmp/smap-'+$stamp+'.sql'
if($Action -eq 'Backup') {
    if($BackupFile){throw 'Backup gera um arquivo novo automaticamente; nao informe BackupFile.'}
    $directory=Join-Path $PSScriptRoot 'backups'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $file=Join-Path $directory ('ocorrencias-'+$stamp+'.sql')
    Invoke-Docker -Arguments @('cp',(Join-Path $PSScriptRoot 'backup-mysql.sh'),($Container+':/tmp/smap-backup.sh'))
    Invoke-Docker -Arguments @('exec',$Container,'sh','/tmp/smap-backup.sh',$remote)
    Invoke-Docker -Arguments @('cp',($Container+':'+$remote),$file)
    if((Get-Item -LiteralPath $file).Length -eq 0){throw 'Backup vazio. Nao continue.'}
    Write-Host "Backup SQL: $file"
    Write-Host ('SHA256: '+(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash)
} else {
    if(!$ConfirmProductionRestore){throw 'Restauracao exige -ConfirmProductionRestore e banco de producao novo/vazio.'}
    if($info.Config.Labels.'com.docker.compose.project' -ne 'smap-production'){throw 'Restauracao permitida somente no projeto smap-production.'}
    if(!$BackupFile){throw 'Informe BackupFile.'}
    $file=(Resolve-Path -LiteralPath $BackupFile).Path
    if((Get-Item -LiteralPath $file).Length -eq 0){throw 'Backup vazio.'}
    Invoke-Docker -Arguments @('cp',$file,($Container+':'+$remote))
    Invoke-Docker -Arguments @('cp',(Join-Path $PSScriptRoot 'restore-mysql.sh'),($Container+':/tmp/smap-restore.sh'))
    Invoke-Docker -Arguments @('exec',$Container,'sh','/tmp/smap-restore.sh',$remote)
    Write-Host 'Importacao concluida. Compare os registros com o banco antigo antes de iniciar a API.'
}
