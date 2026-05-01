# Backend - Gestão de Espaços

API NestJS para cadastro de estudantes, espaços de ensino e controle de entrada/saída.

## Requisitos

- Node.js
- MySQL
- Banco `gestao_espacos`

## Banco de Dados

Execute o schema atualizado:

```bash
mysql -u root -p < ../../database/schema.sql
```

O arquivo `database/schema.sql` apaga o banco `gestao_espacos` atual e cria tudo novamente do zero.

Configuração do banco em `src/app.module.ts`:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Root@123
DB_DATABASE=gestao_espacos
```

Esses são os valores padrão usados quando as variáveis de ambiente não são informadas.

## Instalação

```bash
npm install
```

## Execução

```bash
npm run start:dev
```

API disponível em:

```text
http://localhost:3000
```

## Seed do Admin

Seed é uma carga inicial de dados. Aqui ele cria o primeiro usuário `ADMIN`, sem abrir cadastro público.

```bash
npm run seed:admin
```

Padrão:

```text
email: admin@gestao.local
password: Admin123!
```

Customizado:

```bash
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=StrongPassword123! npm run seed:admin
```

## Autenticação

Rotas públicas:

- `GET /`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Login:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@gestao.local",
  "password": "Admin123!"
}
```

Use o token retornado:

```http
Authorization: Bearer your-token
```

Renovar sessão:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

Logout com revogação do refresh token:

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

Política de sessão:

- `accessToken` expira por padrão em 1 hora.
- `refreshToken` expira por padrão em 7 dias.
- o banco armazena apenas o hash do refresh token.
- ao renovar a sessão, o refresh token antigo é revogado e outro é emitido.

## Roles

- `ADMIN`: gerencia estudantes e espaços.
- `MONITOR`: consulta estudantes, espaços, presenças ativas e registra check-in/check-out.
- `STUDENT`: consulta espaços, registra check-in/check-out e consulta ocupação.

## Fluxo Principal

Criar estudante ou monitor com token de `ADMIN`:

```http
POST /users
Authorization: Bearer admin-token
Content-Type: application/json

{
  "name": "Ana Souza",
  "email": "ana.souza@example.com",
  "password": "student-password",
  "role": "STUDENT"
}
```

Criar espaço com token de `ADMIN`:

```http
POST /spaces
Authorization: Bearer admin-token
Content-Type: application/json

{
  "name": "Laboratory 1",
  "type": "laboratory",
  "capacity": 2
}
```

Registrar entrada:

```http
POST /attendances/check-in
Authorization: Bearer token
Content-Type: application/json

{
  "spaceId": "space-id"
}
```

Registrar saída:

```http
POST /attendances/check-out
Authorization: Bearer token
```

Consultar ocupação:

```http
GET /attendances/occupancy
Authorization: Bearer token
```

Consultar notificações do usuário logado:

```http
GET /attendances/notifications
Authorization: Bearer token
```

Quando a presença ativa ultrapassa o limite de permanência, a resposta traz uma notificação com a mensagem para deixar o ambiente imediatamente.

## Regras de permanência

No check-in, a API grava `expectedExitAt` na presença ativa.

- `classroom`: entrada permitida somente nos períodos `07:30-11:30`, `13:00-17:00` e `19:00-22:30`. A saída esperada é o fim do período atual.
- `study`: máximo de 3 horas a partir da entrada.
- `laboratory`: máximo de 1 hora a partir da entrada.

Além da regra de horário/permanência, o espaço só aceita nova entrada se houver vaga disponível. A API calcula as presenças ativas do espaço e bloqueia o check-in quando `currentOccupancy >= capacity`.

Se `GET /attendances/notifications` for chamado após `expectedExitAt`, o backend registra `overstayNotifiedAt` e retorna a notificação de permanência excedida.

## Rotas

- `POST /auth/login` público
- `POST /auth/refresh` público
- `POST /auth/logout` público
- `POST /users` `ADMIN`
- `GET /users` `ADMIN`, `MONITOR`
- `GET /users/students` `ADMIN`, `MONITOR`
- `GET /users/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /users/:id` `ADMIN`
- `DELETE /users/:id` `ADMIN`
- `POST /spaces` `ADMIN`
- `GET /spaces` `ADMIN`, `MONITOR`, `STUDENT`
- `GET /spaces/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /spaces/:id` `ADMIN`
- `DELETE /spaces/:id` `ADMIN`
- `POST /attendances/check-in` `MONITOR`, `STUDENT`
- `POST /attendances/check-out` `MONITOR`, `STUDENT`
- `GET /attendances/active` `ADMIN`, `MONITOR`
- `GET /attendances/notifications` `MONITOR`, `STUDENT`
- `GET /attendances/occupancy` `ADMIN`, `MONITOR`, `STUDENT`

## Testes

```bash
npm test -- --runInBand
npm run build
```
