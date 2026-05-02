# Gestão de Espaços de Ensino - Front-end

Aplicação Angular para gestão de ocupação de ambientes de ensino. O front-end permite autenticação, acompanhamento de ocupação, cadastro de usuários, cadastro de ambientes, check-in/check-out de presenças e visualização de notificações retornadas pelo backend.

## Tecnologias

- Angular 21
- TypeScript 5.9
- SCSS
- Transloco para internacionalização
- Lucide Angular para ícones
- RxJS para fluxos assíncronos
- Vitest via Angular Test Runner
- ESLint com regras de arquitetura do front

## Pré-requisitos

Antes de rodar a aplicação, instale:

- Node.js compatível com Angular 21
- npm 10 ou superior
- Backend `be-gestao-espacos` rodando localmente

O projeto foi configurado com `npm@10.9.4`.

## Instalação

Entre na pasta do front-end:

```bash
cd frontend/fe-gestao-espacos
```

Instale as dependências:

```bash
npm install
```

## Backend e proxy

Durante o desenvolvimento, o front chama a API por `/api`. O arquivo `proxy.conf.json` redireciona essas chamadas para:

```txt
http://localhost:3000
```

Exemplo:

```txt
/api/auth/login -> http://localhost:3000/auth/login
```

Por isso, antes de usar o front, mantenha o backend rodando na porta `3000`.

## Rodando em desenvolvimento

Use:

```bash
npm run start
```

Esse comando executa:

```bash
ng serve --proxy-config proxy.conf.json
```

Depois abra:

```txt
http://localhost:4200
```

A aplicação recarrega automaticamente quando arquivos são alterados.

## Scripts disponíveis

```bash
npm run start
```

Inicia o servidor local com proxy para o backend.

```bash
npm run build
```

Compila a aplicação para produção e gera os arquivos em `dist/`.

```bash
npm run lint
```

Executa ESLint e a regra de tamanho máximo de classes.

```bash
npm test -- --watch=false
```

Executa os testes uma única vez.

```bash
npm run watch
```

Executa build em modo observação.

## Fluxo de autenticação

O backend retorna `accessToken` e `refreshToken` no login.

O front:

- salva a sessão no `localStorage`;
- envia `Authorization: Bearer <accessToken>` nas rotas protegidas;
- chama `POST /auth/refresh` quando uma requisição protegida retorna `401`;
- salva o novo par `accessToken` + `refreshToken`;
- chama `POST /auth/logout` no logout para revogar o refresh token.

Endpoints de autenticação usados:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Principais funcionalidades

### Login

Tela inicial com autenticação por email e senha institucional.

### Dashboard

Painel com indicadores e gráficos de ocupação.

### Usuários

Disponível para administradores. Permite:

- listar usuários;
- filtrar por role;
- pesquisar;
- criar usuários;
- editar usuários;
- ativar e desativar usuários não-admin.

### Ambientes

Disponível para administradores. Permite:

- listar ambientes;
- cadastrar ambientes;
- remover ambientes.

### Presenças

Disponível para alunos e monitores. Permite:

- registrar entrada em um ambiente;
- registrar saída;
- visualizar notificações retornadas pelo backend.

Quando o backend retorna erro com `message`, o front exibe essa mensagem diretamente para o usuário.

## Regras de acesso

- `ADMIN`: acessa painel, usuários e ambientes.
- `STUDENT`: acessa apenas presença.
- `MONITOR`: acessa apenas presença e, quando aplicável, presenças ativas do ambiente em que está presente.

As seções não autorizadas são escondidas no front. O backend continua sendo a fonte de verdade para autorização.

## Estrutura de pastas

```txt
src/app/core
```

Serviços centrais, autenticação, guards, interceptors HTTP e loader de i18n.

```txt
src/app/features/login
```

Tela e lógica de login.

```txt
src/app/features/dashboard
```

Dashboard, serviços de API, interfaces, componentes internos e helpers.

```txt
src/app/features/dashboard/components
```

Mini componentes do dashboard:

- overview;
- presença;
- usuários;
- ambientes.

```txt
src/app/features/dashboard/helpers
```

Funções auxiliares para formulários, filtros, gráficos, permissões, estado de seção e tratamento de erros HTTP.

```txt
src/app/shared
```

Componentes reutilizáveis.

```txt
src/assets/i18n
```

Dicionários de tradução em `pt`, `en` e `es`.

## Internacionalização

Textos de tela devem ficar nos arquivos:

- `src/assets/i18n/pt.json`
- `src/assets/i18n/en.json`
- `src/assets/i18n/es.json`

Use o pipe `transloco` nos templates.

## Regras de código

- Propriedades usadas por template devem ser `protected`.
- `input()` e `output()` devem ser `public readonly`, pois fazem parte da API pública do componente.
- Métodos públicos em componentes não devem ser usados, exceto lifecycle hooks do Angular.
- Services podem expor métodos públicos.
- Detalhes internos devem ser `private`.
- Arquivos de classe com mais de 500 linhas não são permitidos.
- Lógicas reutilizáveis ou com ramificações devem ir para `helpers/`.
- Helpers com regra de negócio, filtro, permissão ou transformação devem ter testes quando necessário.
- Imports e parâmetros não usados quebram o build via `noUnusedLocals` e `noUnusedParameters`.

## Validação antes de entregar alterações

Rode sempre:

```bash
npm run lint
npm run build
npm test -- --watch=false
```

A aplicação deve ficar sem erros em todos esses comandos.

## Problemas comuns

### `npm run start` não conecta no backend

Verifique se o backend está rodando em:

```txt
http://localhost:3000
```

Confira também o `proxy.conf.json`.

### Login funciona, mas chamadas protegidas retornam `401`

Possíveis causas:

- sessão antiga no `localStorage`;
- refresh token expirado ou revogado;
- backend reiniciado com configuração diferente de JWT;
- usuário removido ou alterado no backend.

Solução rápida em desenvolvimento:

1. Abra as ferramentas do navegador.
2. Limpe o `localStorage`.
3. Faça login novamente.

### Texto aparece sem tradução

Confira se a chave existe nos três arquivos de i18n.

### Uma mudança grande estourou o limite de 500 linhas

Extraia a lógica para:

```txt
src/app/features/<feature>/helpers
```

ou crie um componente menor em:

```txt
src/app/features/<feature>/components
```

## Build de produção

Para gerar os arquivos finais:

```bash
npm run build
```

Os arquivos serão gerados em:

```txt
dist/fe-gestao-espacos
```
