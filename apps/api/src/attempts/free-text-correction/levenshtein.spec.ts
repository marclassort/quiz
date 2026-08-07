import { levenshteinDistance, levenshteinThreshold } from './levenshtein';

describe('levenshteinDistance', () => {
  it('renvoie 0 pour deux chaînes identiques', () => {
    expect(levenshteinDistance('austerlitz', 'austerlitz')).toBe(0);
  });

  it('compte une substitution', () => {
    expect(levenshteinDistance('austerlitz', 'austerlita')).toBe(1);
  });

  it('compte une insertion', () => {
    expect(levenshteinDistance('wagram', 'wagramm')).toBe(1);
  });

  it('compte une suppression', () => {
    expect(levenshteinDistance('wagram', 'wagra')).toBe(1);
  });

  it('gère les chaînes vides', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
});

describe('levenshteinThreshold', () => {
  it('aucune tolérance sous 4 caractères', () => {
    expect(levenshteinThreshold(1)).toBe(0);
    expect(levenshteinThreshold(3)).toBe(0);
  });

  it('tolérance de 1 pour 4-7 caractères', () => {
    expect(levenshteinThreshold(4)).toBe(1);
    expect(levenshteinThreshold(7)).toBe(1);
  });

  it('tolérance de 2 pour 8-12 caractères', () => {
    expect(levenshteinThreshold(8)).toBe(2);
    expect(levenshteinThreshold(12)).toBe(2);
  });

  it('tolérance de 3 au-delà de 12 caractères', () => {
    expect(levenshteinThreshold(13)).toBe(3);
    expect(levenshteinThreshold(50)).toBe(3);
  });
});
