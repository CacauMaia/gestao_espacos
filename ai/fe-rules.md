---

name: angular-feature-generator
description: >-
Generate Angular features with strong UX/UI, accessibility, design system consistency, DOM-based unit tests using Jest + Spectator, strict English naming, i18n using Transloco, and performance optimizations including lazy loading.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Angular Feature Generator

## 🎯 Objetivo

Gerar features completas em Angular com:

* Componentes bem estruturados
* UX clara e funcional
* Integração com API
* Testes unitários baseados em DOM
* Design system consistente
* Nomenclatura em inglês
* Internacionalização (i18n)
* Otimização de performance

---

# 🌍 Convenções de nomenclatura (CRÍTICO)

Toda a base de código deve estar em inglês.

* Pastas, arquivos, classes, variáveis e funções → inglês
* camelCase (variáveis/funções)
* PascalCase (classes)
* Booleanos → is / has / can / should

---

# 🌐 INTERNACIONALIZAÇÃO (CRÍTICO)

## Biblioteca

* Usar Transloco

---

## Estrutura

```bash id="j4d7s1"
src/assets/i18n/
  en.json
  pt.json
  es.json
```

---

## Regras

* Nunca usar texto hardcoded
* Todo texto via transloco
* Garantir consistência entre idiomas

---

## Uso

```html id="y8k2m3"
<button>{{ 'environment.checkIn' | transloco }}</button>
```

---

# 🧱 Estrutura obrigatória

Sempre gerar:

* component.ts
* component.html
* component.scss
* component.spec.ts
* service.ts
* interfaces.ts

---

# 📁 Organização

```bash id="k8f3l2"
src/app/
  core/
  shared/
  features/
    environments/
    presences/

src/styles/
  abstracts/
    _variables.scss
    _mixins.scss
    _typography.scss
```

---

# 🧠 Arquitetura

* Component → UI
* Service → lógica + API
* Interfaces → tipagem

---

# 🎨 UX/UI

* Dashboard simples
* Ações rápidas
* Feedback visual claro

---

# 🔘 Ações principais

* Check In
* Check Out
* Status do usuário

---

# 🎨 Design System

* Sem cores hardcoded
* CSS variables
* Mixins globais
* Tipografia centralizada

---

# ⚡ PERFORMANCE E OTIMIZAÇÃO (CRÍTICO)

## Lazy Loading

* Features devem ser carregadas via lazy loading
* Usar `loadChildren` nas rotas

---

## Exemplo

```ts id="p9x2m7"
{
  path: 'environments',
  loadChildren: () =>
    import('./features/environments/environments.module')
      .then(m => m.EnvironmentsModule)
}
```

---

## Standalone Components (opcional)

* Preferir standalone components quando possível
* Reduzir acoplamento de módulos

---

## Change Detection

* Usar `ChangeDetectionStrategy.OnPush`

---

## Boas práticas

* Evitar re-render desnecessário
* Evitar lógica pesada no template
* Usar trackBy em listas

---

# 🧪 TESTES UNITÁRIOS (CRÍTICO)

## Framework

* Jest + Spectator

---

## Regras

* Testes baseados no DOM
* Nunca acessar classe diretamente
* Interagir via template

---

## Acessibilidade

* byText
* byRole
* byLabelText

---

## Exemplo

```ts id="m3n8p1"
const button = spectator.query(byText('Check In'));
expect(button).toBeTruthy();
```

---

## Mocking

* Mockar services
* Nunca usar HTTP real

---

## Boilerplate

* Evitar repetição
* Criar helpers reutilizáveis

---

# ⚠️ Evitar

* Texto hardcoded
* Lógica no template
* Código duplicado
* Testes frágeis

---

# 📦 Qualidade

* Código limpo
* Tipado
* Modular
* Reutilizável

---

# 📤 Formato de saída

Sempre retornar:

* component.ts
* component.html
* component.scss
* component.spec.ts
* service.ts
* interfaces.ts
* i18n (en, pt, es)
* routing module com lazy loading

---

# 🚨 Importante

* Priorizar UX e performance
* Garantir acessibilidade
* Garantir testabilidade
* Não gerar código desnecessário

---
