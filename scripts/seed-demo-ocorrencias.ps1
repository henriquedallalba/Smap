param(
  [string]$ApiUrl = 'http://localhost:8080',
  [string]$FrontendUrl = 'http://localhost:4200',
  [switch]$ConfirmDemo
)

$ErrorActionPreference = 'Stop'
if (-not $ConfirmDemo) { throw 'Somente dados ficticios. Execute com -ConfirmDemo em ambiente de teste, nunca em um mapa real.' }
$secureToken = Read-Host 'Token da conta de teste (nao sera salvo)' -AsSecureString
$token = [System.Net.NetworkCredential]::new('', $secureToken).Password
if ($token -notmatch '^[A-Za-z0-9_-]{43}$') { throw 'Token invalido.' }
$headers = @{ Authorization = 'Bearer ' + $token }
$endpoint = "$($ApiUrl.TrimEnd('/'))/ocorrencias"
$assets = "$($FrontendUrl.TrimEnd('/'))/assets/ocorrencias"

$ocorrencias = @(
  @{
    titulo = '[Demo] Buraco próximo à faixa de pedestres'
    descricao = 'Buraco no asfalto próximo à travessia, exigindo desvio de bicicletas e veículos.'
    categoria = 'Vias públicas'
    localizacao = 'Rua XV de Novembro, Centro, Blumenau - SC'
    latitude = -26.91916; longitude = -49.06612; status = 'PENDENTE'
    imagemUrl = "$assets/buraco-via.svg"
  },
  @{
    titulo = '[Demo] Poste apagado em ponto de ônibus'
    descricao = 'O poste ao lado do ponto de ônibus não acende durante a noite e deixa o trecho escuro.'
    categoria = 'Iluminação'
    localizacao = 'Rua Joinville, Vila Nova, Blumenau - SC'
    latitude = -26.90568; longitude = -49.08375; status = 'EM_ANDAMENTO'
    imagemUrl = "$assets/iluminacao.svg"
  },
  @{
    titulo = '[Demo] Descarte irregular na calçada'
    descricao = 'Sacos e materiais descartados estão bloqueando parte da passagem de pedestres.'
    categoria = 'Lixo e limpeza'
    localizacao = 'Rua 2 de Setembro, Itoupava Norte, Blumenau - SC'
    latitude = -26.88174; longitude = -49.08396; status = 'PENDENTE'
    imagemUrl = "$assets/lixo.svg"
  },
  @{
    titulo = '[Demo] Acúmulo de água após chuva'
    descricao = 'A água permanece sobre a pista depois da chuva e dificulta a passagem de carros e pedestres.'
    categoria = 'Alagamento'
    localizacao = 'Rua Itajaí, Vorstadt, Blumenau - SC'
    latitude = -26.91014; longitude = -49.04884; status = 'EM_ANDAMENTO'
    imagemUrl = "$assets/alagamento.svg"
  },
  @{
    titulo = '[Demo] Placa de trânsito danificada'
    descricao = 'A placa está inclinada e com baixa visibilidade para quem se aproxima do cruzamento.'
    categoria = 'Sinalização'
    localizacao = 'Rua General Osório, Velha, Blumenau - SC'
    latitude = -26.91673; longitude = -49.10426; status = 'PENDENTE'
    imagemUrl = "$assets/sinalizacao.svg"
  },
  @{
    titulo = '[Demo] Calçada sem passagem acessível'
    descricao = 'O desnível e a ausência de rampa impedem a passagem segura de cadeira de rodas.'
    categoria = 'Acessibilidade'
    localizacao = 'Rua Amazonas, Garcia, Blumenau - SC'
    latitude = -26.94504; longitude = -49.06475; status = 'RESOLVIDA'
    imagemUrl = "$assets/acessibilidade.svg"
  },
  @{
    titulo = '[Demo] Tampa de bueiro desnivelada'
    descricao = 'A tampa está abaixo do nível da pista e oferece risco para motos e bicicletas.'
    categoria = 'Vias públicas'
    localizacao = 'Rua República Argentina, Ponta Aguda, Blumenau - SC'
    latitude = -26.91782; longitude = -49.04691; status = 'PENDENTE'
    imagemUrl = "$assets/buraco-via.svg"
  },
  @{
    titulo = '[Demo] Resíduos próximos à drenagem'
    descricao = 'Resíduos acumulados junto ao meio-fio podem obstruir a entrada de água da chuva.'
    categoria = 'Lixo e limpeza'
    localizacao = 'Rua Bahia, Salto Weissbach, Blumenau - SC'
    latitude = -26.89931; longitude = -49.12748; status = 'EM_ANDAMENTO'
    imagemUrl = "$assets/lixo.svg"
  }
)

$existentes = @(Invoke-RestMethod -Method Get -Uri $endpoint)
$titulosExistentes = @($existentes | ForEach-Object { $_.titulo })
$criadas = 0

foreach ($ocorrencia in $ocorrencias) {
  if ($titulosExistentes -contains $ocorrencia.titulo) {
    Write-Host "Já existe: $($ocorrencia.titulo)"
    continue
  }

  $body = $ocorrencia | ConvertTo-Json -Depth 4
  $salva = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
  Write-Host "Criada #$($salva.id): $($salva.titulo)"
  $criadas++
}

Write-Host "Concluído: $criadas ocorrência(s) criada(s)."
