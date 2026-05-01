---

name: nest-endpoint-generator
description: >-
Generate NestJS endpoints with unit tests following clean architecture and best practices.
------------------------------------------------------------------------------------------

# NestJS Endpoint Generator (with Tests)

## Estrutura obrigatória

Sempre gerar:

* Controller
* Service
* DTO
* Entity (se necessário)
* Unit tests para Service

---

## Regras de arquitetura

* Controller → apenas entrada HTTP
* Service → TODA regra de negócio
* Repository → acesso ao banco (TypeORM)

---

## Testes unitários (OBRIGATÓRIO)

### Testar apenas o Service

* Usar Jest
* Mockar repository
* Não acessar banco real

---

## Cenários obrigatórios de teste

Para cada regra de negócio, gerar testes:

### ✔ Caso de sucesso

* Entrada válida cria presença

### ✔ Regra: presença ativa

* Deve lançar erro se aluno já estiver em ambiente

### ✔ Regra: capacidade

* Deve lançar erro se ambiente estiver cheio

---

## Exemplo de estrutura de teste

```ts
describe('PresencaService', () => {
  it('should create presence successfully', async () => {});

  it('should throw error if student already has active presence', async () => {});

  it('should throw error if environment is full', async () => {});
});
```

---

## Regras de qualidade de teste

* Usar mocks (jest.fn())
* Não usar banco real
* Testes isolados
* Nome descritivo

---

## Erros

* Usar exceptions do NestJS
* Testar erros com:

```ts
await expect(service.method()).rejects.toThrow();
```

---

## Formato de saída

Gerar arquivos separados:

* presencas.controller.ts
* presencas.service.ts
* create-presenca.dto.ts
* presencas.service.spec.ts

---

## Código deve ser

* Limpo
* Testável
* Modular
* Legível

---
