# Gestão de Espaços de Ensino

Aplicação web para controlar o uso de espaços de ensino, com cadastro de usuários, ambientes, autenticação por token, check-in/check-out, ocupação e regras de permanência.

## Estrutura

```txt
backend/be-gestao-espacos   API NestJS
frontend/fe-gestao-espacos  Aplicação Angular
database/schema.sql         Schema MySQL consolidado
docs                        Documentação técnica e decisões
ai                          Prompts e regras auxiliares
```

## Pré-requisitos

- Docker
- Docker Compose

O front foi configurado com `npm@10.9.4`.

## Banco de Dados

O schema consolidado fica em:

```txt
database/schema.sql
```

Ele apaga o banco `gestao_espacos` atual e cria tudo novamente do zero.

## Docker (recomendado para clonagem e execução rápida)

### Antes de rodar

Instale o Docker conforme seu sistema:

- **Linux:** instale Docker Engine e Docker Compose Plugin pelo gerenciador da sua distribuição ou pela documentação oficial do Docker.
- **Windows:** instale Docker Desktop, habilite o backend WSL 2 quando solicitado e execute os comandos no PowerShell, Windows Terminal ou terminal da sua distro WSL.
- **macOS:** instale Docker Desktop e aguarde o Docker Engine ficar ativo antes de rodar os comandos.

Este projeto usa o comando moderno `docker compose`. Em instalações antigas, o comando pode ser `docker-compose`.

Crie o arquivo de variáveis de ambiente antes do primeiro start:

```bash
cp .env.example .env
```

Depois, atualize `SEED_ADMIN_PASSWORD` no `.env` com uma senha segura de sua escolha.

A partir da raiz do repositório, execute:

```bash
docker compose up --build
```

Isso cria e levanta:

- `db`: MySQL com `gestao_espacos` inicializado usando `database/schema.sql`
- `backend`: API NestJS em `http://localhost:3000`
- `frontend`: app Angular em `http://localhost:4200`

No fluxo com Docker, não é necessário rodar `npm install` nas pastas de backend ou frontend. As dependências são instaladas durante o build das imagens.

O banco de dados não é exposto por padrão na porta do host para evitar conflitos com MySQL local. O backend se comunica com ele internamente via rede Docker.

O Docker Compose carrega variáveis do `.env` na raiz do projeto para configurar banco e seed do admin. As principais são:

```txt
DB_PASSWORD=Root@123
DB_DATABASE=gestao_espacos
RUN_SEED_ADMIN=true
SEED_ADMIN_EMAIL=admin@gestao.local
SEED_ADMIN_PASSWORD=sua_senha_segura
```

No start do Docker, o backend aguarda o banco, executa a migração idempotente de presenças e depois roda `seed:admin` para criar o admin padrão se ele não existir.

Para parar e remover os containers:

```bash
docker compose down
```

Para parar e apagar também o volume do banco, recriando tudo do zero no próximo start:

```bash
docker compose down -v
```

### Observações por sistema operacional

**Linux**

Se aparecer erro de permissão ao acessar o Docker, como `permission denied while trying to connect to the Docker daemon socket`, rode o comando com `sudo`:

```bash
sudo docker compose up --build
```

Para evitar usar `sudo` sempre, adicione seu usuário ao grupo `docker`:

```bash
sudo usermod -aG docker $USER
```

Depois saia da sessão e entre novamente, ou reinicie o terminal. Essa configuração dá ao usuário permissão ampla sobre o Docker da máquina, então use apenas em ambiente em que isso faça sentido.

**Windows**

Use Docker Desktop com WSL 2 habilitado. Se estiver usando WSL, mantenha o projeto dentro do filesystem Linux da distro, por exemplo `~/projetos/gestao_espacos`, para evitar lentidão com volumes montados a partir de `C:\`.

Os comandos são os mesmos:

```powershell
docker compose up --build
docker compose down
```

**macOS**

Abra o Docker Desktop e espere o ícone indicar que o Docker está rodando. Depois execute os comandos normalmente no Terminal:

```bash
docker compose up --build
docker compose down
```

## Execução local sem Docker

Use esta opção apenas se quiser rodar backend e frontend diretamente na sua máquina, sem containers. Nesse fluxo, é necessário ter Node.js, npm e MySQL instalados localmente.

### Backend

Entre na pasta:

```bash
cd backend/be-gestao-espacos
```

Instale as dependências:

```bash
npm install
```

Crie o admin inicial:

```bash
npm run seed:admin
```

Credenciais padrão do seed:

```txt
email: admin@gestao.local
password: Admin123!
```

Rode a API:

```bash
npm run start:dev
```

Backend disponível em:

```txt
http://localhost:3000
```

Configuração padrão do banco, sobrescrevível por variáveis de ambiente:

```txt
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Root@123
DB_DATABASE=gestao_espacos
```

### Frontend

Em outro terminal, entre na pasta:

```bash
cd frontend/fe-gestao-espacos
```

Instale as dependências:

```bash
npm install
```

Rode o Angular:

```bash
npm run start
```

Frontend disponível em:

```txt
http://localhost:4200
```

Durante o desenvolvimento, o front chama `/api` e o `proxy.conf.json` redireciona para o backend em `http://localhost:3000`.

## Fluxo Rápido

Com Docker:

1. Crie o `.env` a partir do `.env.example`.
2. Ajuste `SEED_ADMIN_PASSWORD`.
3. Rode `docker compose up --build`.
4. Acesse `http://localhost:4200`.

Sem Docker:

1. Execute `database/schema.sql` no MySQL local.
2. Rode `npm install` no backend.
3. Rode `npm run seed:admin` no backend.
4. Rode `npm run start:dev` no backend.
5. Rode `npm install` no frontend.
6. Rode `npm run start` no frontend.
7. Acesse `http://localhost:4200`.

## Autenticação

O backend usa:

- `accessToken` com expiração curta.
- `refreshToken` persistido no banco apenas como hash.
- rotação de refresh token em `POST /auth/refresh`.
- revogação de refresh token em `POST /auth/logout`.

## Regras Principais

- `ADMIN` gerencia usuários e espaços.
- `MONITOR` e `STUDENT` registram check-in/check-out.
- Usuários não-admin podem ser ativados ou desativados por `ADMIN`; usuário desativado não faz login nem check-in.
- Se um usuário desativado ainda tiver presença ativa, ela é encerrada automaticamente quando o prazo esperado de saída vence.
- Um usuário só pode ter uma presença ativa.
- Um espaço só aceita entrada se `currentOccupancy < capacity`.
- `classroom` aceita entrada apenas em `07:30-11:30`, `13:00-17:00` e `19:00-22:30`.
- `study` permite até 3 horas de uso.
- `laboratory` permite até 1 hora de uso.
- Após o prazo, o backend retorna notificação para o usuário deixar o ambiente.
- Presenças vencidas há mais de 6 horas são encerradas automaticamente.
- Alunos e monitores veem o próprio histórico, incluindo saídas manuais, automáticas e encerradas por monitor/admin.
- Admins e monitores precisam confirmar em modal própria antes de encerrar presença de terceiros.

## Validação

Backend:

```bash
cd backend/be-gestao-espacos
npm test -- --runInBand
npm run build
```

Frontend:

```bash
cd frontend/fe-gestao-espacos
npm run lint
npm run build
npm test -- --watch=false
```

## Documentação

- [Backend](backend/be-gestao-espacos/README.md)
- [Frontend](frontend/fe-gestao-espacos/README.md)
- [Decisões técnicas](docs/decisions.md)
- [Arquitetura](docs/architecture.md)
- [Tasks](docs/tasks.md)
