# Cenários de Testes

Este documento resume os cenários de teste cobertos atualmente e os cenários recomendados para evolução.

## Como Rodar

Backend:

```bash
cd backend/be-gestao-espacos
npm test
npm run test:cov
```

Frontend:

```bash
cd frontend/fe-gestao-espacos
npm test -- --watch=false
npm run test:cov
```

## Cobertura Mínima

Backend e frontend usam cobertura mínima de 70% para:

- statements
- branches
- functions
- lines

No backend, o gate de cobertura foca código de regra e comportamento:

- services
- use cases
- domain
- common helpers

No frontend, o gate de cobertura foca unidades já cobertas por testes unitários:

- `AuthService`
- componentes de login e dashboard
- helpers de dashboard testados

Serviços HTTP, facades, interceptors e fluxos E2E seguem documentados como lacunas para evolução gradual da cobertura.

## CI

O workflow fica em `.github/workflows/ci.yml`.

Em push para `main`/`master` e em pull requests, o CI executa:

- instalação com `npm ci`
- testes com cobertura
- build do backend
- build do frontend

Teste frontend específico:

```bash
cd frontend/fe-gestao-espacos
npx ng test --include src/app/features/dashboard/components/spaces/spaces.component.spec.ts --watch=false
```

## Backend

### Autenticação

Coberto:

- Login com credenciais válidas retorna `accessToken`, `refreshToken`, tipo `Bearer` e dados do usuário.
- Login com credenciais inválidas retorna erro.
- Usuário desativado não consegue fazer login.
- Refresh token válido emite nova sessão e revoga o token anterior.
- Logout revoga refresh token.
- Token válido é assinado e verificado.
- Token malformado, adulterado ou expirado é rejeitado.
- Refresh token gera hash e data de expiração.
- Senhas são armazenadas com hash `scrypt`.
- Comparação de senha correta/incorreta é validada.
- Senhas legadas em texto puro ainda são comparadas por compatibilidade.

Arquivos:

- `src/auth/auth.service.spec.ts`
- `src/auth/services/token.service.spec.ts`
- `src/auth/services/password.service.spec.ts`

### Usuários

Coberto:

- Criação de usuário com e-mail único.
- Bloqueio de criação quando o e-mail já está cadastrado.
- Erro ao buscar usuário inexistente.
- Bloqueio de autodeleção de admin.
- Bloqueio de exclusão de outro admin.
- Desativação de usuário não-admin por admin.
- Ativação e desativação de usuário não-admin via update.
- Bloqueio de ativação/desativação de admin.
- Listagem com filtro por role e busca.
- Paginação com filtros por role, status ativo e busca.
- Validação do filtro `active`.

Arquivos:

- `src/users/users.service.spec.ts`

### Ambientes

Coberto:

- Criação de ambiente com capacidade válida.
- Bloqueio de capacidade menor ou igual a zero.
- Erro ao buscar ambiente inexistente.
- Atualização de ambiente com dados válidos.
- Listagem com filtro por tipo e nome.
- Paginação de ambientes.
- Validação do filtro de tipo.

Arquivos:

- `src/spaces/spaces.service.spec.ts`

### Presenças

Coberto:

- `AttendancesService` delega check-in para o use case.
- Check-in cria presença quando a política permite.
- Check-in rejeita usuário com presença ativa.
- Política de check-in bloqueia usuário desativado.
- Política de check-in bloqueia admin.
- Política de check-in bloqueia ambiente cheio.
- Política de check-in calcula saída esperada por tipo de ambiente.
- Política de check-in bloqueia entrada em sala de aula fora dos períodos permitidos.
- Política de check-in bloqueia entrada em sala de aula quando faltam menos de 50 minutos para o fim do período.
- Check-out registra saída de presença ativa.
- Check-out sem presença ativa retorna erro.
- Consulta da presença ativa do usuário logado.
- Listagem de presenças ativas sem paginação.
- Paginação de presenças ativas com filtros.
- Restrição de presenças ativas de monitor ao próprio ambiente ativo.
- Retorno de presenças ativas vazias quando monitor não está em nenhum ambiente.
- Validação dos filtros de presenças ativas.
- Retorno de notificações de permanência excedida.
- Retorno de alerta quando faltam 10 minutos ou menos para a saída prevista.
- Encerramento forçado por monitor/admin com justificativa opcional.
- Bloqueio de encerramento forçado por usuário sem permissão.
- Bloqueio de monitor encerrando presença fora do próprio ambiente ativo.
- Histórico de presenças com paginação e filtros por perfil, tipo de ambiente, motivo, período e busca.
- Restrição do histórico de estudante ao próprio usuário.
- Restrição do histórico de monitor ao próprio usuário.
- Retorno de histórico próprio do monitor mesmo quando não está em nenhum ambiente.
- Histórico próprio inclui presenças encerradas manualmente, automaticamente ou por monitor/admin.
- Listagem de ocupação por espaço.
- Encerramento automático de presenças ativas vencidas há mais de 6 horas com motivo `auto_expired`.
- Encerramento automático de presença vencida de usuário desativado com motivo `auto_expired`.

Arquivos:

- `src/attendances/attendances.service.spec.ts`
- `src/attendances/application/use-cases/check-in.use-case.spec.ts`
- `src/attendances/domain/check-in.policy.spec.ts`

### Smoke / E2E Básico

Coberto:

- `GET /` responde no teste e2e inicial.

Arquivos:

- `test/app.e2e-spec.ts`

## Frontend

### Autenticação

Coberto:

- Refresh imediato quando o access token salvo já está expirado.
- Agendamento de refresh antes do access token expirar.
- Falha no refresh limpa sessão e redireciona para login.

Arquivos:

- `src/app/core/auth/auth.service.spec.ts`

### Login

Coberto:

- Renderização do formulário de login e ação principal.

Arquivos:

- `src/app/features/login/login.component.spec.ts`

### Dashboard

Coberto:

- Renderização do fluxo de presença do estudante.
- Restrição de seções por perfil.
- Ordenação e normalização dos dados de gráfico.
- Filtro de presenças visíveis para monitor.

Arquivos:

- `src/app/features/dashboard/dashboard.component.spec.ts`
- `src/app/features/dashboard/helpers/dashboard-sections.helper.spec.ts`
- `src/app/features/dashboard/helpers/dashboard-charts.helper.spec.ts`
- `src/app/features/dashboard/helpers/dashboard-attendance.helper.spec.ts`

### Overview

Coberto:

- Renderização das métricas do painel.
- Emissão de evento ao selecionar seção.

Arquivos:

- `src/app/features/dashboard/components/overview/overview.component.spec.ts`

### Presenças

Coberto:

- Renderização de cards de ambientes.
- Emissão de check-in para ambiente disponível.
- Exibição do card de presença atual.
- Emissão de check-out.
- Exibição do histórico de presenças com motivo de encerramento.
- Histórico exibe somente sessões encerradas.
- Histórico usa texto de encerramento em vez de estado ativo para registros legados.
- Emissão de encerramento forçado por monitor/admin.
- Encerramento forçado usa modal própria do sistema e só confirma a ação ao emitir confirmação.
- Emissão de carregamento adicional do histórico.

Arquivos:

- `src/app/features/dashboard/components/attendance/attendance.component.spec.ts`

### Usuários

Coberto:

- Renderização da lista de usuários.
- Emissão das ações de edição, alteração de status e busca.
- Emissão das ações de criar, atualizar, cancelar edição, filtrar por role e carregar mais.

Arquivos:

- `src/app/features/dashboard/components/users/users.component.spec.ts`

### Ambientes

Coberto:

- Renderização da lista de ambientes.
- Emissão de ação de edição.
- Emissão de ação de exclusão.
- Renderização do formulário de edição.
- Emissão das ações de salvar edição e cancelar edição.

Arquivos:

- `src/app/features/dashboard/components/spaces/spaces.component.spec.ts`

## Lacunas Recomendadas

### Backend

- Testar `AuthTokenGuard` e `RolesGuard`.
- Adicionar testes de controller para rotas protegidas por role.
- Adicionar testes de integração com banco para login e persistência em `refresh_tokens`.
- Adicionar teste de concorrência ou integração para check-in quando resta apenas uma vaga.
- Cobrir validações de DTO com payloads inválidos nas rotas HTTP.

### Frontend

- Testar toast de sucesso e erro: renderização, botão fechar e fechamento automático.
- Testar fluxo de edição de ambiente integrado no `DashboardComponent`.
- Testar chamadas HTTP do `DashboardService` para `PATCH /spaces/:id`.
- Testar interceptors HTTP para prefixo de API e refresh em resposta `401`.

### E2E

- Login de admin e entrada no dashboard.
- Admin cria, edita e remove ambiente.
- Admin cria usuário.
- Estudante faz check-in e check-out.
- Monitor visualiza presenças ativas do ambiente.
- Usuário com token inválido ou expirado é redirecionado para login.
