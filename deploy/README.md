# Publicar smartmap.tech pelo PC

Esta configuração está preparada para Cloudflare Tunnel, mas NÃO configura DNS, não cria/publica uma rota e não migra dados automaticamente. Valide primeiro em localhost:8090.

## Mudanças de segurança

- Angular compilado para produção, sem ng serve público; API em /api e autenticação em /identity no mesmo domínio HTTPS.
- Fotos pendentes/recusadas: acesso do autor ou administração do território. Fotos de ocorrências aprovadas: públicas, sem cache persistente para permitir retirada. Arquivos novos são reencodificados no servidor, removendo metadados; 5 MB de entrada e 24 milhões de pixels no máximo.
- CPF informado: validação dos dígitos, criptografado apenas na auth. Não comprova identidade, não impede cadastros duplicados e não é fundamento para banir CPF. Sem serviço externo de verificação e sem banimento por IP. Banimentos por conta mantidos.
- Termos/privacidade versão 2026-10-01.1; arquivos antigos preservados. Novos cadastros precisam aceitar a revisão atual.
- Territórios operacionais continuam manuais, não são limites oficiais.

## Pré-requisitos obrigatórios

1. Rodar testes das duas APIs e do frontend e build de produção. O teste integrado de cadastro/login, fotos, moderação, banimento e hierarquia deve passar antes da rota pública.
2. Identificar o container MySQL antigo em `docker ps`; não executar down, rm ou recriar esse container.
3. Parar gravações na API antiga, fazer backup SQL e restaurar/testar em banco novo. Não desativar/apagar o banco antigo até confirmar a migração.
4. Parar a auth antiga antes de usar seu volume em produção. Nunca abrir o mesmo H2 por duas instâncias. Fazer backup consistente do volume auth-smap_auth-data enquanto a auth está parada, e guardar a mesma AUTH_ENCRYPTION_KEY com segurança.
5. Preservar a pasta inteira de uploads do iniciador, incluindo arquivos `.owner`. Não publicar a pasta como arquivos estáticos nem remover metadados de autoria.
6. Guardar backups fora do PC também. Backups contêm dados pessoais; não publicar ou versionar.

## Configuração

Copie `.env.example` para `.env` nesta pasta. Preencha caminhos absolutos da API e da auth atualizadas, a pasta de uploads existente, a MESMA chave da auth e duas senhas fortes/distintas do banco. `.env` e backups são ignorados pelo Git. Não enviar tokens/senhas em prints.

```powershell
docker network ls
docker compose --env-file .env -f compose.production.yaml config --quiet
```

Se a rede smap-auth-network não existir: `docker network create smap-auth-network`.

## Migração do MySQL (não automática)

Com a API antiga parada, substitua os nomes exemplificados pelos containers verificados:

```powershell
.\mysql-data.ps1 -Action Backup -Container NOME_DO_DB_ANTIGO
docker compose --env-file .env -f compose.production.yaml up -d db
docker compose --env-file .env -f compose.production.yaml ps
.\mysql-data.ps1 -Action Restore -Container NOME_DO_DB_NOVO -BackupFile CAMINHO_DO_BACKUP.sql -ConfirmProductionRestore
```

O script se recusa a importar em projeto diferente de smap-production ou banco com tabelas existentes. Não altera o banco antigo. Verifique compatibilidade do dump com MySQL 8.4 e compare contagens/dados antes de prosseguir. Não execute a API antes de importar, pois ela cria tabelas.

Com os dados conferidos, auth antiga parada e backups disponíveis:

```powershell
docker compose --env-file .env -f compose.production.yaml up -d --build auth api web
docker compose --env-file .env -f compose.production.yaml exec web nginx -t
```

Abra http://localhost:8090. Teste cadastro com aceite/CPF, login, foto pendente privada, aprovação pública, recusa privada, admin fora da área e banimento local/global. Nunca use usuários/senhas de demonstração em produção.

## Conectar o túnel já existente (só após validar)

O conector Cloudflared deve estar na rede smap-auth-network. Em `docker ps`, identifique o container do túnel e conecte-o, sem expor o token:

```powershell
docker network connect smap-auth-network NOME_DO_CONTAINER_DO_TUNEL
```

No painel do túnel, a aplicação publicada será smartmap.tech, serviço **HTTP**, URL **smap-web:80**. HTTPS é entregue pela Cloudflare; a conexão interna Docker usa HTTP. Não aponte para 4200, 8080 ou 8081. www exige uma segunda rota se desejado. Remova/substitua registros DNS conflitantes apenas após conferir sua finalidade; preserve registros de e-mail.

Não há publicação automática. Para interromper exposição imediatamente, pare somente o container do túnel. Mantenha o PC/Docker ligados, internet ativa e suspensão desabilitada por você. Configure backups recorrentes e acompanhe uso do disco; limitação por IP não substitui proteção contra abuso. A política legal deve ser revisada pelo responsável antes do lançamento.
