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

- Node.js
- npm
- MySQL

O front foi configurado com `npm@10.9.4`.

## Banco de Dados

O schema consolidado fica em:

```txt
database/schema.sql
```

Ele apaga o banco `gestao_espacos` atual e cria tudo novamente do zero.

### Opção 1: Usando MySQL diretamente

Execute a partir da raiz do projeto:

```bash
mysql -u root -p < database/schema.sql
```

Com a senha local usada no projeto:

```bash
mysql -u root -pRoot@123 < database/schema.sql
```

### Opção 2: Usando script Node.js (recomendado)

Entre na pasta do backend e execute:

```bash
cd backend/be-gestao-espacos
npm run seed:schema
```

O script usa variáveis de ambiente para a conexão MySQL:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`

Se não estiverem definidas, o script usa os valores padrão definidos em `backend/be-gestao-espacos/scripts/seed-schema.ts`.

Exemplo:

```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=Root@123 npm run seed:schema
```

> Importante: rode este comando dentro de `backend/be-gestao-espacos`, não dentro de `backend` ou `frontend`.


### Opção 2: Usando script Node.js (recomendado)

Entre na pasta do backend e execute:

```bash
cd backend/be-gestao-espacos
npm run seed:schema
```

Isso executa o schema usando as configurações do ambiente (host, usuário, senha).

## Backend

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

## Frontend

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

1. Execute `database/schema.sql`.
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
- Um usuário só pode ter uma presença ativa.
- Um espaço só aceita entrada se `currentOccupancy < capacity`.
- `classroom` aceita entrada apenas em `07:30-11:30`, `13:00-17:00` e `19:00-22:30`.
- `study` permite até 3 horas de uso.
- `laboratory` permite até 1 hora de uso.
- Após o prazo, o backend retorna notificação para o usuário deixar o ambiente.

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
