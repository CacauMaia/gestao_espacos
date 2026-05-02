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

Documentação Swagger:

```text
http://localhost:3000/api/docs
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
- Usuários não-admin podem ser ativados ou desativados por `ADMIN`; usuários desativados não fazem login nem check-in.

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

## Consultas com filtros e paginação

As listagens de usuários, espaços e presenças ativas mantêm compatibilidade com o frontend atual: sem `page` ou `limit`, retornam um array simples. Quando `page` ou `limit` são enviados, a resposta passa a ter `items` e `meta`.

Usuários:

```http
GET /users?role=STUDENT&active=true&search=ana&page=1&limit=10
Authorization: Bearer token
```

- `role`: `ADMIN`, `MONITOR` ou `STUDENT`.
- `active`: `true` ou `false`.
- `search`: busca por nome ou email.
- `page`: página positiva; padrão `1` quando `limit` é enviado.
- `limit`: itens por página; padrão `10` e máximo `100`.

Espaços:

```http
GET /spaces?type=laboratory&search=lab&page=1&limit=10
Authorization: Bearer token
```

- `type`: `classroom`, `laboratory` ou `study`.
- `search`: busca por nome.
- `page`: página positiva; padrão `1` quando `limit` é enviado.
- `limit`: itens por página; padrão `10` e máximo `100`.

Resposta paginada:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Presenças ativas:

```http
GET /attendances/active?role=STUDENT&spaceType=laboratory&search=ana&page=1&limit=10
Authorization: Bearer token
```

- `userId`: filtra por usuário.
- `spaceId`: filtra por espaço.
- `role`: `ADMIN`, `MONITOR` ou `STUDENT`.
- `spaceType`: `classroom`, `laboratory` ou `study`.
- `search`: busca por nome/email do usuário ou nome do espaço.
- `page`: página positiva; padrão `1` quando `limit` é enviado.
- `limit`: itens por página; padrão `10` e máximo `100`.

## Regras de permanência

No check-in, a API grava `expectedExitAt` na presença ativa.

- `classroom`: entrada permitida somente nos períodos `07:30-11:30`, `13:00-17:00` e `19:00-22:30`. A saída esperada é o fim do período atual.
- `study`: máximo de 3 horas a partir da entrada.
- `laboratory`: máximo de 1 hora a partir da entrada.

Além da regra de horário/permanência, o espaço só aceita nova entrada se houver vaga disponível. A API calcula as presenças ativas do espaço e bloqueia o check-in quando `currentOccupancy >= capacity`.

O check-in roda em transação com lock pessimista no usuário e no espaço. Isso evita corrida quando duas entradas simultâneas tentam usar a última vaga ou quando o mesmo usuário tenta entrar em ambientes diferentes ao mesmo tempo.

Internamente, o check-in fica separado em `CheckInUseCase`, `CheckInPolicy` e um port/adaptor de repositório para Attendance. Esse desenho deixa a regra crítica testável sem acoplar o caso de uso diretamente ao TypeORM.

Se `GET /attendances/notifications` for chamado após `expectedExitAt`, o backend registra `overstayNotifiedAt` e retorna a notificação de permanência excedida.

## Rotas

- `POST /auth/login` público
- `POST /auth/refresh` público
- `POST /auth/logout` público
- `POST /users` `ADMIN`
- `GET /users` `ADMIN`, `MONITOR`
- `GET /users/students` `ADMIN`, `MONITOR`
- `GET /users/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /users/:id` `ADMIN`; também ativa/desativa não-admin via `active`
- `DELETE /users/:id` `ADMIN`; desativa logicamente não-admin
- `POST /spaces` `ADMIN`
- `GET /spaces` `ADMIN`, `MONITOR`, `STUDENT`
- `GET /spaces/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /spaces/:id` `ADMIN`
- `DELETE /spaces/:id` `ADMIN`
- `POST /attendances/check-in` `MONITOR`, `STUDENT`
- `POST /attendances/check-out` `MONITOR`, `STUDENT`
- `GET /attendances/active` `ADMIN`, `MONITOR`
- `GET /attendances/current` `MONITOR`, `STUDENT`
- `GET /attendances/notifications` `MONITOR`, `STUDENT`
- `GET /attendances/occupancy` `ADMIN`, `MONITOR`, `STUDENT`

## Testes

```bash
npm test -- --runInBand
npm run build
```
