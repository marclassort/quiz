import { normalizeFreeText } from './normalize';

describe('normalizeFreeText', () => {
  it('trim et met en casse basse', () => {
    expect(normalizeFreeText('  Austerlitz  ')).toBe('austerlitz');
  });

  it('supprime les diacritiques', () => {
    expect(normalizeFreeText('Général')).toBe('general');
    expect(normalizeFreeText('Empereur français')).toBe('empereur francais');
    expect(normalizeFreeText('Château')).toBe('chateau');
  });

  it('supprime la ponctuation', () => {
    expect(normalizeFreeText('Austerlitz, 1805 !')).toBe('austerlitz 1805');
  });

  it('réduit les espaces multiples', () => {
    expect(normalizeFreeText('bataille    des    Trois Empereurs')).toBe(
      'bataille des trois empereurs',
    );
  });

  it('retire un article initial avec espace (le/la/les/de)', () => {
    expect(normalizeFreeText('la bataille')).toBe('bataille');
    expect(normalizeFreeText('le général')).toBe('general');
    expect(normalizeFreeText('les Alliés')).toBe('allies');
    expect(normalizeFreeText('de Wagram')).toBe('wagram');
  });

  it("retire un article initial élidé (l'/d')", () => {
    expect(normalizeFreeText("l'Autriche")).toBe('autriche');
    expect(normalizeFreeText("d'Austerlitz")).toBe('austerlitz');
  });

  it("ne retire pas un article qui n'est pas en tête de chaîne", () => {
    expect(normalizeFreeText('bataille des Trois Empereurs')).toBe('bataille des trois empereurs');
  });

  it('exemple du §3 : les trois variantes normalisent de façon cohérente', () => {
    expect(normalizeFreeText('Austerlitz')).toBe('austerlitz');
    expect(normalizeFreeText("bataille d'Austerlitz")).toBe(
      normalizeFreeText('bataille dausterlitz'),
    );
    expect(normalizeFreeText('bataille des Trois Empereurs')).toBe('bataille des trois empereurs');
  });
});
