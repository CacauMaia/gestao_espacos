# Tasks - Gestão de Espaços

## Concluído

- [x] Configurar backend NestJS.
- [x] Configurar conexão com MySQL.
- [x] Criar schema do banco.
- [x] Criar módulo de autenticação.
- [x] Implementar login com email e senha.
- [x] Gerar token Bearer.
- [x] Implementar refresh token persistido no banco.
- [x] Implementar rotação de refresh token.
- [x] Implementar logout com revogação de refresh token.
- [x] Proteger rotas com guards.
- [x] Criar entidade `User`.
- [x] Implementar CRUD de usuários.
- [x] Validar email único.
- [x] Implementar filtro de usuários por nome e role.
- [x] Criar entidade `Space`.
- [x] Implementar CRUD de espaços.
- [x] Validar capacidade maior que zero.
- [x] Criar entidade `Attendance`.
- [x] Implementar check-in.
- [x] Implementar check-out.
- [x] Validar presença ativa única por usuário.
- [x] Validar capacidade do espaço.
- [x] Implementar ocupação por espaço.
- [x] Implementar limite de permanência por tipo de espaço.
- [x] Implementar notificação de permanência excedida.
- [x] Atualizar banco com `expected_exit_at` e `overstay_notified_at`.
- [x] Atualizar banco com `refresh_tokens`.
- [x] Criar seed do admin.
- [x] Atualizar documentação de decisões.
- [x] Atualizar README do backend.

## Pendente ou futuro

- [ ] Configurar frontend Angular, se ainda não estiver completo.
- [ ] Exibir notificações de permanência excedida no frontend.
- [ ] Atualizar frontend para usar `/auth/refresh` quando o access token expirar.
- [ ] Atualizar frontend para chamar `/auth/logout` ao sair.
- [ ] Criar rotina automática para consultar notificações enquanto o usuário estiver logado.
- [ ] Revisar UX do check-in/check-out no frontend.
- [ ] Adicionar testes específicos para regras de limite de permanência.
- [ ] Adicionar testes específicos para `GET /attendances/notifications`.
- [ ] Considerar variáveis de ambiente para configuração do banco em vez de valores fixos em `app.module.ts`.
