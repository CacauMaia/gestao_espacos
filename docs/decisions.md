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

**Decisão:** aplicar arquitetura mais hexagonal de forma incremental, começando pelo check-in.

**Motivo:** check-in é o fluxo com maior concentração de regra de negócio e risco de concorrência. Migrar esse fluxo primeiro valida o padrão sem aumentar o custo de mudança no backend inteiro.

**Estrutura atual em Attendance:**

- `application/use-cases/check-in.use-case.ts`: caso de uso do check-in.
- `domain/check-in.policy.ts`: regras puras de elegibilidade, capacidade e permanência.
- `application/ports/attendance-check-in.repository.port.ts`: contrato de persistência do caso de uso.
- `infrastructure/typeorm-attendance-check-in.repository.ts`: adapter TypeORM com transação e locks.

Users e Spaces seguem no padrão controller/service/repository do NestJS e podem repetir o modelo depois, conforme a complexidade desses domínios crescer.

## Documentação da API

**Decisão:** expor Swagger em `GET /api/docs`.

**Motivo:** a API já possui filtros, paginação e autenticação Bearer; Swagger reduz ambiguidade para quem consome ou testa as rotas.

**Decisão:** usar DTOs de query para listagens filtradas.

**Motivo:** validação e transformação de query params ficam explícitas na borda HTTP, e a documentação da API mostra os filtros aceitos.

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
- `active`
- `createdAt`

**Regras:**

- `email` deve ser único.
- `name`, `email` e `password` são obrigatórios na criação.
- se `role` não for enviado, o padrão é `STUDENT`.
- apenas `ADMIN` pode criar, editar, ativar ou desativar usuários.
- `ADMIN` não pode ser ativado ou desativado pelo endpoint de usuários.
- `DELETE /users/:id` faz desativação lógica de usuários não-admin, marcando `active = false`.
- `PATCH /users/:id` aceita `active` para ativar ou desativar usuários não-admin.
- usuário desativado não consegue fazer login nem novo check-in.
- se um usuário desativado permanece com presença ativa, o backend encerra automaticamente essa presença quando `expectedExitAt` vence.
- busca em `GET /users?search=texto` filtra por nome ou email.
- `GET /users?role=STUDENT&active=true&search=ana` combina filtro por role, status ativo e busca.
- `GET /users?page=1&limit=10` ativa resposta paginada com `items` e `meta`.
- sem `page` e sem `limit`, `GET /users` mantém resposta em array simples para compatibilidade.

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
- `GET /spaces?type=laboratory&search=lab` combina filtro por tipo e busca por nome.
- `GET /spaces?page=1&limit=10` ativa resposta paginada com `items` e `meta`.
- sem `page` e sem `limit`, `GET /spaces` mantém resposta em array simples para compatibilidade.

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
- `checkoutReason`
- `closedByUserId`
- `checkoutNote`

**Regras de check-in:**

- apenas `STUDENT` e `MONITOR` podem fazer check-in.
- `ADMIN` não pode marcar presença.
- o usuário autenticado é usado como dono da presença; o cliente não envia `userId`.
- o body do check-in contém apenas `spaceId`.
- o cliente não envia `entryAt` nem `expectedExitAt`; o backend define esses horários.
- o usuário não pode ter mais de uma presença ativa.
- o espaço só aceita nova entrada se houver vaga disponível.
- vaga disponível significa `currentOccupancy < capacity`.
- `currentOccupancy` considera apenas presenças ativas, ou seja, registros com `exitAt` nulo.
- se `currentOccupancy >= capacity`, o backend rejeita a entrada com `Space está cheio.`.
- a validação de presença ativa e capacidade roda em transação.
- o backend aplica lock pessimista no usuário e no espaço durante o check-in para serializar entradas concorrentes.
- no check-in, o backend calcula e grava `expectedExitAt`.
- `GET /attendances/active` aceita filtros por `userId`, `spaceId`, `role`, `spaceType` e `search`.
- `search` em presenças ativas busca por nome/email do usuário ou nome do espaço.
- `GET /attendances/active?page=1&limit=10` ativa resposta paginada com `items` e `meta`.
- sem `page` e sem `limit`, `GET /attendances/active` mantém resposta em array simples para compatibilidade.

**Escopo de presenças ativas por perfil:**

- `ADMIN` pode consultar presenças ativas de todos os ambientes.
- `MONITOR` só consulta presenças ativas do ambiente em que está com presença ativa.
- se o monitor não possui presença ativa, a listagem coletiva retorna vazia.
- `STUDENT` não acessa a listagem coletiva de presenças ativas.

**Regras de check-out:**

- apenas `STUDENT` e `MONITOR` podem fazer check-out.
- o backend localiza a presença ativa do usuário autenticado.
- o body do check-out não define `userId` nem `exitAt`; o backend usa o token e o relógio do servidor.
- se não houver presença ativa, retorna erro.
- o backend grava `exitAt`, `checkoutReason = manual` e `closedByUserId` do próprio usuário.

## Encerramento Forçado e Histórico

**Decisão:** permitir que `MONITOR` e `ADMIN` encerrem presenças esquecidas.

**Rota:**

- `POST /attendances/:id/force-check-out`

**Regras:**

- `STUDENT` não pode encerrar presença de terceiros.
- `ADMIN` pode encerrar presença ativa de qualquer ambiente.
- `MONITOR` só pode encerrar presença ativa de outro usuário no ambiente em que o monitor está com presença ativa.
- se o monitor não possui presença ativa, o encerramento forçado é negado.
- encerramento forçado grava `exitAt`, `checkoutReason = forced`, `closedByUserId` e `checkoutNote` opcional.
- a justificativa é opcional e limitada pelo campo `checkoutNote`.
- no frontend, o encerramento forçado abre uma modal própria do sistema.
- cancelar a modal não chama a API; a presença só é encerrada após confirmação explícita.

**Decisão:** manter histórico das sessões encerradas.

**Rota:**

- `GET /attendances/history`

**Regras:**

- histórico contém apenas presenças encerradas, ou seja, registros com `exitAt` preenchido.
- `STUDENT` só consulta o próprio histórico.
- `MONITOR` só consulta o próprio histórico.
- `MONITOR` não precisa ter presença ativa para consultar o próprio histórico.
- histórico de `STUDENT` e `MONITOR` inclui saídas manuais, automáticas e encerradas por monitor/admin.
- `ADMIN` pode consultar histórico global e usar filtros livremente.
- filtros aceitos: `userId`, `spaceId`, `role`, `spaceType`, `checkoutReason`, `from`, `to`, `search`, `page` e `limit`.
- `search` busca por nome/email do usuário ou nome do ambiente.
- com `page` ou `limit`, a resposta é paginada com `items` e `meta`.
- sem `page` e sem `limit`, a resposta mantém array simples para compatibilidade.

**Tipos de encerramento (`checkoutReason`):**

- `manual`: saída registrada pelo próprio usuário.
- `auto_expired`: saída automática por tempo excedido.
- `forced`: encerrada por monitor/admin.

**Registros legados:**

- presenças encerradas antes da criação de `checkoutReason` podem ter `checkoutReason` nulo.
- no frontend, esses registros aparecem como `Saída registrada`.

## Limite de permanência

**Decisão:** o prazo de permanência fica gravado na presença em `expectedExitAt`.

**Motivo:** a regra fica histórica. Mesmo que regras futuras mudem, cada presença mantém o prazo calculado no momento da entrada.

**Decisão:** faixa de horário, limite de permanência e capacidade são validações cumulativas.

**Motivo:** um espaço só pode receber uma nova presença se o usuário puder entrar naquele horário e se ainda existir capacidade disponível. Cumprir uma dessas condições não dispensa a outra.

**Regras por tipo de espaço:**

- `classroom`: entrada permitida somente dentro dos períodos `07:30-11:30`, `13:00-17:00` e `19:00-22:30`.
- `classroom`: a saída esperada é o fim do período atual.
- `classroom`: check-in é bloqueado quando faltam menos de 50 minutos para o fim do período.
- `study`: máximo de 3 horas a partir da entrada.
- `laboratory`: máximo de 1 hora a partir da entrada.

**Timezone de referência:** `America/Sao_Paulo`.

**Decisão:** salas de aula rejeitam check-in fora das janelas válidas.

**Mensagem de erro para janelas inválidas:** `Salas de aula permitem entrada apenas entre 07:30-11:30, 13:00-17:00 ou 19:00-22:30.`

**Mensagem de erro para fim de período próximo:** `Entrada em sala de aula bloqueada quando faltam menos de 50 minutos para o fim do período.`

## Notificações

**Decisão:** a notificação de tempo excedido é consultada pelo endpoint do usuário logado.

**Rota:**

- `GET /attendances/notifications`

**Regras:**

- disponível para `STUDENT` e `MONITOR`.
- se faltam mais de 10 minutos para `expectedExitAt`, retorna lista vazia.
- se faltam 10 minutos ou menos para `expectedExitAt`, retorna alerta preventivo.
- se `expectedExitAt` já passou, retorna uma notificação.
- na primeira notificação, o backend grava `overstayNotifiedAt`.
- a mensagem retornada é: `Tempo de permanência excedido. Deixe o ambiente imediatamente.`

## Encerramento Automático

**Decisão:** encerrar automaticamente presenças esquecidas após tolerância.

**Regra:**

- se uma presença ativa está com `expectedExitAt` vencido há mais de 6 horas, o backend encerra a presença.
- se o usuário da presença foi desativado, o backend encerra a presença assim que `expectedExitAt` vence, sem aguardar a tolerância de 6 horas.
- o encerramento automático grava `exitAt` e `checkoutReason = auto_expired`.
- essa rotina é agendada a cada 10 minutos e também roda de forma oportunista antes de check-in e antes das consultas de presença ativa, presença atual, histórico, notificações e ocupação.

**Motivo:** presenças esquecidas não devem distorcer ocupação, capacidade disponível ou relatórios no dia seguinte.

## Ocupação

**Decisão:** ocupação é calculada pelas presenças ativas.

**Presença ativa:** registro em `attendances` com `exitAt` nulo.

**Decisão:** a ocupação é a fonte da regra de capacidade no check-in.

**Motivo:** o sistema precisa impedir novas entradas quando a quantidade de presenças ativas alcançar a capacidade cadastrada para o espaço.

**Decisão:** check-in usa transação com lock pessimista no usuário e no espaço.

**Motivo:** duas tentativas simultâneas para o mesmo usuário ou para a última vaga do mesmo espaço não podem passar pela validação usando a mesma ocupação antiga. O lock força essas operações a serem avaliadas em sequência antes da criação da presença.

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
- `PATCH /users/:id` `ADMIN`; também ativa/desativa não-admin via `active`
- `DELETE /users/:id` `ADMIN`; desativa logicamente não-admin

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
- `GET /attendances/history` `ADMIN`, `MONITOR`, `STUDENT`
- `GET /attendances/current` `MONITOR`, `STUDENT`
- `GET /attendances/notifications` `MONITOR`, `STUDENT`
- `GET /attendances/occupancy` `ADMIN`, `MONITOR`, `STUDENT`
- `POST /attendances/:id/force-check-out` `ADMIN`, `MONITOR`

## Testes

**Decisão:** priorizar testes de services.

**Motivo:** as regras de negócio ficam nos services e podem ser testadas com repositories mockados, sem depender do banco.

**Comandos de verificação:**

```bash
npm test -- --runInBand
npm run build
```
