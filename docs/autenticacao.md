# Login para registrar ocorrências

Branch coordenada: `feat/autenticacao-ocorrencias` em **Smap** e **api-smap**. Use a `main` da **auth-smap**.

## Executar

1. Configure e inicie `auth-smap` na porta 8081 conforme o README dela. Para o cadastro de cidadãos não é necessário provisionar o administrador supremo.
2. Inicie `api-smap` desta branch na porta 8080 com `AUTH_SERVICE_URL=http://localhost:8081` (já é o padrão). Seu banco MySQL deve estar disponível.
3. Nesta pasta do frontend, execute `npm ci` e `npx ng serve -o`.
4. Clique em **Registrar ocorrência**. Sem sessão você será levado ao login. Crie sua conta e entre: o destino original é preservado.

O frontend usa `environment.authUrl` e `environment.apiUrl`. Localmente o hostname acompanha o endereço usado para abrir o Smap. Se acessar pelo celular/rede local, configure `AUTH_ALLOWED_ORIGINS` na auth-smap com a origem exata do frontend (por exemplo `http://192.168.1.10:4200`) e disponibilize os servidores na rede. Em produção configure URLs HTTPS e a origem correta.

## Comportamento

- Login e cadastro reais na auth-smap. A conta comum precisa de nome, sobrenome, email e senha de 12 caracteres ou mais, limitada a 72 bytes UTF-8.
- CPF, telefone e CEP não são solicitados porque a auth-smap ainda não armazena esses campos.
- As contas antigas salvas somente neste navegador não são contas da API. É necessário cadastrá-las novamente; os registros locais antigos, que continham senhas em texto, são removidos.
- A sessão e o token ficam **apenas em memória**, nunca em localStorage. Atualizar/fechar a página exige novo login. Logout tenta revogar a sessão no servidor e sempre encerra a sessão local.
- O login do supremo tem um campo opcional de código TOTP; para essa conta o servidor exige o código.
- A rota de registro e as páginas do perfil consultam `/auth/me` antes de permitir acesso.
- O cabeçalho Bearer só é enviado aos endereços configurados das APIs; nunca a mapas ou outros serviços.
- A API verifica a sessão novamente ao criar a ocorrência e ao receber a foto. Token expirado/revogado resulta em 401; autenticação indisponível resulta em 503.
- A ocorrência recebe o identificador do autor validado no servidor, um novo ID e status `PENDENTE`. Não é possível forjar o autor ou sobrescrever outra ocorrência usando POST.
- Leitura do mapa e das ocorrências continua pública.

## Escopo

Esta branch integra autenticação para **criação e upload**. Administração territorial, proteção das operações administrativas PUT/DELETE, recuperação de senha, login social e polígonos do mapa não estão integrados nesta etapa. Não interprete o novo login como proteção completa do painel administrativo existente.

O GitHub Actions executa os testes focados de autenticação e o build de produção. Para repetir: `npx ng test --watch=false --include=src/app/auth/auth.spec.ts` e `npm run build`.
