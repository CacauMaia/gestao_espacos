# Decisões Técnicas e Regras de Negócio

Este documento registra as decisões atuais da aplicação Gestão de Espaços. Ele deve ser atualizado sempre que uma regra de negócio, rota, entidade ou política de acesso mudar.

## Plataforma

**Decisão:** usar NestJS no backend.

**Motivo:** a aplicação é organizada por módulos de domínio, com controllers para entrada HTTP, services para regras de negócio e repositories do TypeORM para acesso ao banco.

**Módulos atuais:**

- `auth`
- `users`
- `spaces`
- `attendances`

## Banco de dados

**Decisão:** usar MySQL com TypeORM.

**Banco:** `gestao_espacos`.

**Tabelas principais:**

- `users`
- `spaces`
- `attendances`
- `refresh_tokens`

**Decisão:** manter `database/schema.sql` como fonte única do banco local.

**Motivo:** no momento o projeto está em fase de evolução local, então é mais simples recriar o banco do zero com um schema consolidado do que manter uma sequência de alterações incrementais.

**Comportamento do schema:** o arquivo apaga o banco `gestao_espacos` atual e cria novamente todas as tabelas, constraints e índices.

## Autenticação

**Decisão:** autenticação por token Bearer assinado no backend.

**Rota pública de login:**

- `POST /auth/login`

**Formato de autenticação nas rotas protegidas:**

```http
Authorization: Bearer token
```

**Payload do token:**

- `sub`: id do usuário.
- `email`: email do usuário.
- `role`: papel do usuário.
- `iat`: data de emissão.
- `exp`: data de expiração.

**Expiração padrão:** 1 hora, configurável por `AUTH_TOKEN_EXPIRES_IN_SECONDS`.

**Decisão:** usar `accessToken` curto e `refreshToken` persistido no banco.

**Motivo:** o access token pode expirar mais rápido sem derrubar a sessão do usuário. O refresh token permite renovar a sessão de forma controlada e pode ser revogado no logout.

**Política atual de sessão:**

- `accessToken`: assinado pelo backend e enviado em `Authorization: Bearer token`.
- `refreshToken`: token aleatório retornado no login e usado somente para renovar sessão ou fazer logout.
- o banco salva apenas `token_hash`, nunca o refresh token puro.
- expiração padrão do `accessToken`: 1 hora, configurável por `AUTH_TOKEN_EXPIRES_IN_SECONDS`.
- expiração padrão do `refreshToken`: 7 dias, configurável por `AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS`.
- `POST /auth/refresh` valida o refresh token, revoga o token antigo e emite um novo par `accessToken` + `refreshToken`.
- `POST /auth/logout` revoga o refresh token informado.

**Tabela:** `refresh_tokens`.

**Campos principais:**

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt`
- `createdAt`

**Variáveis recomendadas:**

- `AUTH_TOKEN_SECRET`
- `AUTH_TOKEN_EXPIRES_IN_SECONDS`
- `AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS`

## Seed do admin

**Decisão:** o primeiro usuário admin é criado por seed, não por cadastro público.

**Comando:**

```bash
npm run seed:admin
```

**Valores padrão:**

- email: `admin@gestao.local`
- password: `Admin123!`
- name: `Administrador`
- role: `ADMIN`

**Customização:** variáveis `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `SEED_ADMIN_NOME`.

## Usuários

**Decisão:** usar uma entidade única `User` para administradores, monitores e estudantes.

**Roles:**

- `ADMIN`: gerencia usuários e espaços.
- `MONITOR`: consulta usuários, espaços, presenças ativas, ocupação e pode registrar sua própria entrada/saída.
- `STUDENT`: consulta espaços, ocupação e pode registrar sua própria entrada/saída.

**Campos principais:**

- `id`
- `name`
- `email`
- `password`
- `role`
- `createdAt`

**Regras:**

- `email` deve ser único.
- `name`, `email` e `password` são obrigatórios na criação.
- se `role` não for enviado, o padrão é `STUDENT`.
- apenas `ADMIN` pode criar, editar ou remover usuários.
- busca em `GET /users?search=texto` filtra por nome.
- `GET /users?role=STUDENT&search=ana` combina filtro por role e nome.

## Espaços

**Decisão:** os espaços são cadastrados em `spaces`.

**Tipos suportados:**

- `classroom`
- `laboratory`
- `study`

**Campos principais:**

- `id`
- `name`
- `type`
- `capacity`
- `createdAt`

**Regras:**

- `name`, `type` e `capacity` são obrigatórios na criação.
- `capacity` deve ser um número inteiro maior que zero.
- `type` deve ser um dos tipos suportados.
- `capacity` representa o número máximo de usuários simultâneos no espaço.
- apenas `ADMIN` pode criar, editar ou remover espaços.
- `ADMIN`, `MONITOR` e `STUDENT` podem consultar espaços.

## Presenças

**Decisão:** entradas e saídas são registradas na tabela `attendances`.

**Campos principais:**

- `id`
- `userId`
- `spaceId`
- `entryAt`
- `expectedExitAt`
- `exitAt`
- `overstayNotifiedAt`

**Regras de check-in:**

- apenas `STUDENT` e `MONITOR` podem fazer check-in.
- `ADMIN` não pode marcar presença.
- o usuário autenticado é usado como dono da presença; o cliente não envia `userId`.
- o body do check-in contém apenas `spaceId`.
- o usuário não pode ter mais de uma presença ativa.
- o espaço só aceita nova entrada se houver vaga disponível.
- vaga disponível significa `currentOccupancy < capacity`.
- `currentOccupancy` considera apenas presenças ativas, ou seja, registros com `exitAt` nulo.
- se `currentOccupancy >= capacity`, o backend rejeita a entrada com `Space está cheio.`.
- no check-in, o backend calcula e grava `expectedExitAt`.

**Regras de check-out:**

- apenas `STUDENT` e `MONITOR` podem fazer check-out.
- o backend localiza a presença ativa do usuário autenticado.
- se não houver presença ativa, retorna erro.
- o backend grava `exitAt`.

## Limite de permanência

**Decisão:** o prazo de permanência fica gravado na presença em `expectedExitAt`.

**Motivo:** a regra fica histórica. Mesmo que regras futuras mudem, cada presença mantém o prazo calculado no momento da entrada.

**Decisão:** faixa de horário, limite de permanência e capacidade são validações cumulativas.

**Motivo:** um espaço só pode receber uma nova presença se o usuário puder entrar naquele horário e se ainda existir capacidade disponível. Cumprir uma dessas condições não dispensa a outra.

**Regras por tipo de espaço:**

- `classroom`: entrada permitida somente dentro dos períodos `07:30-11:30`, `13:00-17:00` e `19:00-22:30`.
- `classroom`: a saída esperada é o fim do período atual.
- `study`: máximo de 3 horas a partir da entrada.
- `laboratory`: máximo de 1 hora a partir da entrada.

**Timezone de referência:** `America/Sao_Paulo`.

**Decisão:** salas de aula rejeitam check-in fora das janelas válidas.

**Mensagem de erro para janelas inválidas:** `Salas de aula permitem entrada apenas entre 07:30-11:30, 13:00-17:00 ou 19:00-22:30.`

## Notificações

**Decisão:** a notificação de tempo excedido é consultada pelo endpoint do usuário logado.

**Rota:**

- `GET /attendances/notifications`

**Regras:**

- disponível para `STUDENT` e `MONITOR`.
- se a presença ativa ainda estiver dentro do prazo, retorna lista vazia.
- se `expectedExitAt` já passou, retorna uma notificação.
- na primeira notificação, o backend grava `overstayNotifiedAt`.
- a mensagem retornada é: `Tempo de permanência excedido. Deixe o ambiente imediatamente.`

## Ocupação

**Decisão:** ocupação é calculada pelas presenças ativas.

**Presença ativa:** registro em `attendances` com `exitAt` nulo.

**Decisão:** a ocupação é a fonte da regra de capacidade no check-in.

**Motivo:** o sistema precisa impedir novas entradas quando a quantidade de presenças ativas alcançar a capacidade cadastrada para o espaço.

**Rota:**

- `GET /attendances/occupancy`

**Resposta inclui:**

- `spaceId`
- `name`
- `type`
- `capacity`
- `currentOccupancy`
- `availableSlots`
- `occupancyPercentage`

## Rotas atuais

### Auth

- `POST /auth/login` público
- `POST /auth/refresh` público
- `POST /auth/logout` público

### Users

- `POST /users` `ADMIN`
- `GET /users` `ADMIN`, `MONITOR`
- `GET /users/students` `ADMIN`, `MONITOR`
- `GET /users/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /users/:id` `ADMIN`
- `DELETE /users/:id` `ADMIN`

### Spaces

- `POST /spaces` `ADMIN`
- `GET /spaces` `ADMIN`, `MONITOR`, `STUDENT`
- `GET /spaces/:id` `ADMIN`, `MONITOR`, `STUDENT`
- `PATCH /spaces/:id` `ADMIN`
- `DELETE /spaces/:id` `ADMIN`

### Attendances

- `POST /attendances/check-in` `MONITOR`, `STUDENT`
- `POST /attendances/check-out` `MONITOR`, `STUDENT`
- `GET /attendances/active` `ADMIN`, `MONITOR`
- `GET /attendances/notifications` `MONITOR`, `STUDENT`
- `GET /attendances/occupancy` `ADMIN`, `MONITOR`, `STUDENT`

## Testes

**Decisão:** priorizar testes de services.

**Motivo:** as regras de negócio ficam nos services e podem ser testadas com repositories mockados, sem depender do banco.

**Comandos de verificação:**

```bash
npm test -- --runInBand
npm run build
```
