import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('deve gerar hash scrypt e comparar senha correta', () => {
    const hash = service.hash('Senha123!');

    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(service.compare('Senha123!', hash)).toBe(true);
    expect(service.compare('SenhaErrada', hash)).toBe(false);
  });

  it('deve manter compatibilidade com senhas legadas em texto puro', () => {
    expect(service.compare('password', 'password')).toBe(true);
    expect(service.compare('outra', 'password')).toBe(false);
  });
});
