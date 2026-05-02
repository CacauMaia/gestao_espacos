# Arquitetura do Sistema

## Visão geral

A aplicação Gestão de Espaços é composta por:

- frontend Angular
- backend NestJS
- banco de dados MySQL

O backend expõe uma API REST para autenticação, usuários, espaços e controle de presença. A documentação interativa da API fica em `GET /api/docs` quando o backend está em execução.

## Backend

O backend fica em `backend/be-gestao-espacos` e é organizado por domínio:

- `auth`
- `users`
- `spaces`
- `attendances`

Cada domínio segue a separação:

- Controller: recebe a requisição HTTP e aplica decorators de rota/permissão.
- Service: concentra as regras de negócio.
- Repository TypeORM: acessa o banco por entidade.

O domínio de presenças já iniciou uma separação mais próxima de arquitetura hexagonal para o fluxo crítico de check-in:

- `CheckInUseCase`: orquestra o caso de uso de entrada.
- `CheckInPolicy`: concentra as regras de usuário ativo, papel permitido, presença ativa, capacidade e prazo esperado de saída.
- `AttendanceCheckInRepositoryPort`: define o contrato usado pelo caso de uso.
- `TypeOrmAttendanceCheckInRepository`: adapta o contrato para TypeORM, transação e locks pessimistas.

Esse padrão foi aplicado primeiro em Attendance por ser o fluxo com maior risco de concorrência. Users e Spaces podem migrar gradualmente depois, sem reestruturar o sistema inteiro de uma vez.

As listagens de `users`, `spaces` e `attendances/active` aceitam filtros no backend e paginação opcional. Sem `page` e `limit`, os endpoints retornam arrays simples para preservar compatibilidade com clientes existentes. Com `page` ou `limit`, retornam `{ items, meta }`, com total de itens, total de páginas e indicadores de próxima/anterior.

## Entidades

- `User`: representa `ADMIN`, `MONITOR` e `STUDENT`.
- `Space`: representa ambientes dos tipos `classroom`, `laboratory` e `study`.
- `Attendance`: representa entrada, saída, prazo esperado de saída, notificação de permanência excedida e forma de encerramento.

Campos relevantes de `Attendance`:

- `entryAt`: data/hora de entrada.
- `expectedExitAt`: data/hora máxima esperada para saída.
- `exitAt`: data/hora em que a presença foi encerrada. Enquanto estiver nulo, a presença está ativa.
- `overstayNotifiedAt`: primeira data/hora em que o usuário foi notificado por permanência excedida.
- `checkoutReason`: tipo de encerramento da presença.
- `closedByUserId`: usuário responsável pelo encerramento, quando aplicável.
- `checkoutNote`: justificativa opcional para encerramento por monitor/admin.

Valores de `checkoutReason`:

- `manual`: saída registrada pelo próprio usuário.
- `auto_expired`: saída automática por tempo excedido.
- `forced`: presença encerrada por monitor/admin.

## Fluxo de autenticação

1. Cliente chama `POST /auth/login` com email e senha.
2. Backend valida as credenciais.
3. Backend retorna `accessToken` do tipo Bearer.
4. Cliente envia `Authorization: Bearer token` nas rotas protegidas.
5. `AuthTokenGuard` valida o token.
6. `RolesGuard` valida se a role pode acessar a rota.

## Fluxo de presença

1. `STUDENT` ou `MONITOR` chama `POST /attendances/check-in` com `spaceId`.
2. `CheckInUseCase` abre o fluxo pelo port de repositório.
3. O adapter TypeORM carrega usuário, espaço, presença ativa e ocupação dentro de transação.
4. `CheckInPolicy` valida usuário, espaço, presença ativa, capacidade e calcula `expectedExitAt`.
5. Backend cria a presença ativa.
6. Usuário chama `POST /attendances/check-out` para encerrar a presença.

O body do check-in contém apenas `spaceId`. O cliente não envia `userId`, `entryAt` ou `expectedExitAt`; o backend usa o usuário autenticado pelo token e calcula os horários no servidor. O check-out também usa apenas o token do usuário autenticado e não aceita `userId` ou `exitAt` vindos do cliente.

No check-in, a validação de capacidade usa apenas presenças ativas. Se a ocupação atual for igual ou maior que a capacidade do espaço, a entrada é recusada.

A validação de check-in roda em transação com lock pessimista no usuário e no espaço. Assim, tentativas concorrentes para a última vaga ou para o mesmo usuário são serializadas antes de contar ocupação e criar a presença.

Regras principais:

- `ADMIN` não registra presença.
- `STUDENT` e `MONITOR` só podem ter uma presença ativa por vez.
- Presença ativa é qualquer registro em `attendances` com `exitAt` nulo.
- O usuário autenticado é sempre o dono da presença; o cliente não escolhe `userId`.
- O horário de entrada, saída esperada e saída efetiva são definidos pelo backend.
- A ocupação de um ambiente é calculada somente por presenças ativas.
- Um novo check-in só é permitido se `currentOccupancy < capacity`.
- `classroom` aceita entrada somente nos períodos `07:30-11:30`, `13:00-17:00` e `19:00-22:30`.
- `classroom` usa o fim do período atual como `expectedExitAt`.
- `classroom` bloqueia check-in quando faltam menos de 50 minutos para o fim do período.
- `laboratory` permite permanência de 1 hora.
- `study` permite permanência de 3 horas.

## Escopo por Perfil em Presenças

`STUDENT`:

- registra apenas a própria entrada e saída;
- consulta apenas a própria presença atual;
- consulta apenas o próprio histórico, incluindo saídas manuais, automáticas e encerradas por monitor/admin;
- recebe apenas as próprias notificações.

`MONITOR`:

- registra a própria entrada e saída;
- enquanto está em um ambiente, vê as presenças ativas daquele mesmo ambiente;
- se não estiver com presença ativa, a listagem coletiva de presenças ativas retorna vazia;
- só pode encerrar presença de outro usuário se esse usuário estiver no mesmo ambiente ativo do monitor;
- consulta o próprio histórico, incluindo saídas manuais, automáticas e encerradas por admin/monitor;
- não precisa estar em um ambiente ativo para ver o próprio histórico.

`ADMIN`:

- não registra presença;
- pode consultar ocupação global;
- pode ver presenças ativas de todos os ambientes;
- pode ver histórico global;
- pode encerrar presença ativa de qualquer ambiente.

## Fluxo de notificação

1. Usuário chama `GET /attendances/notifications`.
2. Backend busca a presença ativa do usuário.
3. Se faltam 10 minutos ou menos para `expectedExitAt`, retorna um alerta preventivo.
4. Se o prazo passou, registra `overstayNotifiedAt` na primeira emissão.
5. Backend retorna a mensagem para deixar o ambiente imediatamente.

## Encerramento automático de presença

Para evitar que presenças esquecidas distorçam a ocupação, o backend encerra automaticamente presenças ativas cujo `expectedExitAt` passou há mais de 6 horas.

Essa limpeza roda de forma agendada a cada 10 minutos e também de forma oportunista antes de check-in e antes das consultas de presença ativa, presença atual, histórico, notificações e ocupação. A presença recebe `exitAt`, `checkoutReason = auto_expired` e deixa de contar como ativa.

Se um usuário não-admin é desativado por um `ADMIN` enquanto ainda possui presença ativa, a presença não é encerrada imediatamente. Quando o `expectedExitAt` dessa presença vence, o backend faz checkout automático sem aguardar a tolerância de 6 horas. Esse encerramento também usa `checkoutReason = auto_expired`.

Monitores e admins também podem encerrar uma presença ativa manualmente pelo painel de presenças. Nesse caso o registro recebe `checkoutReason = forced`, `closedByUserId` e uma justificativa opcional em `checkoutNote`.

No frontend, o encerramento forçado por monitor/admin exige confirmação em modal própria do sistema. Clicar em cancelar apenas fecha a modal e nunca chama a API de encerramento.

Para `MONITOR`, o backend valida o ambiente antes de encerrar:

- busca a presença ativa do monitor;
- compara o `spaceId` do monitor com o `spaceId` da presença alvo;
- se forem diferentes, rejeita a operação.

Para `ADMIN`, não há restrição por ambiente no encerramento forçado.

## Histórico de Presenças

O histórico lista sessões encerradas, ou seja, presenças com `exitAt` preenchido.

O frontend também ignora defensivamente qualquer item sem `exitAt` caso uma API/cache antigo devolva presença ativa dentro do histórico.

Filtros disponíveis no backend:

- `userId`
- `spaceId`
- `role`
- `spaceType`
- `checkoutReason`
- `from`
- `to`
- `search`
- `page`
- `limit`

Regras de escopo:

- `STUDENT`: o backend força `userId` para o usuário autenticado.
- `MONITOR`: o backend força `userId` para o usuário autenticado.
- `ADMIN`: pode usar filtros livremente.

No frontend, a coluna de encerramento representa como a sessão foi finalizada:

- `Registrada pelo usuário`: saída manual.
- `Automática por tempo excedido`: encerramento automático após tolerância ou após vencimento do prazo de usuário desativado.
- `Encerrada por monitor/admin`: encerramento forçado.
- `Saída registrada`: fallback para registros legados encerrados antes da criação de `checkoutReason`.

O frontend exibe histórico com busca local por usuário/ambiente e filtro por tipo de encerramento.

## Banco de dados

O schema completo fica em `database/schema.sql`.

O schema é a fonte única para recriar o banco local do zero.

Como o Docker usa volume persistente, o backend executa no startup a migração idempotente `migrate:attendance-checkout` para adicionar os campos de histórico de saída quando o banco já existe.

Tabelas atuais:

- `users`
- `spaces`
- `attendances`
- `refresh_tokens`

## Fluxo de sessão

1. Cliente chama `POST /auth/login`.
2. Backend retorna `accessToken` e `refreshToken`.
3. Cliente usa `accessToken` nas rotas protegidas.
4. Quando o `accessToken` expira, cliente chama `POST /auth/refresh` com o `refreshToken`.
5. Backend revoga o refresh token antigo e emite um novo par de tokens.
6. No logout, cliente chama `POST /auth/logout` com o `refreshToken`.
7. Backend revoga o refresh token informado.

## Testabilidade

As regras principais são testadas com repositories/use cases mockados. O check-in também possui teste direto do caso de uso, o que permite validar a política de entrada sem depender de banco real.
