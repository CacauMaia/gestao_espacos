# Arquitetura do Sistema

## Visão geral

A aplicação Gestão de Espaços é composta por:

- frontend Angular
- backend NestJS
- banco de dados MySQL

O backend expõe uma API REST para autenticação, usuários, espaços e controle de presença.

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

## Entidades

- `User`: representa `ADMIN`, `MONITOR` e `STUDENT`.
- `Space`: representa ambientes dos tipos `classroom`, `laboratory` e `study`.
- `Attendance`: representa entrada, saída, prazo esperado de saída e notificação de permanência excedida.

## Fluxo de autenticação

1. Cliente chama `POST /auth/login` com email e senha.
2. Backend valida as credenciais.
3. Backend retorna `accessToken` do tipo Bearer.
4. Cliente envia `Authorization: Bearer token` nas rotas protegidas.
5. `AuthTokenGuard` valida o token.
6. `RolesGuard` valida se a role pode acessar a rota.

## Fluxo de presença

1. `STUDENT` ou `MONITOR` chama `POST /attendances/check-in` com `spaceId`.
2. Backend valida usuário, espaço, presença ativa e capacidade.
3. Backend calcula `expectedExitAt` conforme o tipo do espaço.
4. Backend cria a presença ativa.
5. Usuário chama `POST /attendances/check-out` para encerrar a presença.

No check-in, a validação de capacidade usa apenas presenças ativas. Se a ocupação atual for igual ou maior que a capacidade do espaço, a entrada é recusada.

## Fluxo de notificação

1. Usuário chama `GET /attendances/notifications`.
2. Backend busca a presença ativa do usuário.
3. Se `expectedExitAt` ainda não passou, retorna lista vazia.
4. Se o prazo passou, registra `overstayNotifiedAt` na primeira emissão.
5. Backend retorna a mensagem para deixar o ambiente imediatamente.

## Banco de dados

O schema completo fica em `database/schema.sql`.

O schema é a fonte única para recriar o banco local do zero.

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

As regras principais são testadas nos services com repositories mockados. Isso mantém os testes rápidos e focados na regra de negócio.
