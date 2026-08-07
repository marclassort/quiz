import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hash / verify', () => {
    it('hache un mot de passe et le vérifie correctement', async () => {
      const hash = await service.hash('motdepassesolide123');

      expect(hash).not.toBe('motdepassesolide123');
      await expect(service.verify(hash, 'motdepassesolide123')).resolves.toBe(true);
      await expect(service.verify(hash, 'mauvaismotdepasse')).resolves.toBe(false);
    });

    it('produit un hash au format argon2id', async () => {
      const hash = await service.hash('motdepassesolide123');
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('assertStrongEnough', () => {
    it('accepte un mot de passe suffisamment robuste', async () => {
      await expect(
        service.assertStrongEnough('correct-horse-battery-staple-42'),
      ).resolves.toBeUndefined();
    });

    it('rejette un mot de passe faible ou commun', async () => {
      await expect(service.assertStrongEnough('azertyuiop123')).rejects.toThrow();
    });

    it("rejette un mot de passe contenant l'email ou le displayName fournis", async () => {
      await expect(
        service.assertStrongEnough('napoleon@example.com123', ['napoleon@example.com']),
      ).rejects.toThrow();
    });
  });
});
