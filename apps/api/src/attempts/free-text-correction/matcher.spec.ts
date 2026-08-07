import { matchFreeTextAnswer } from './matcher';

describe('matchFreeTextAnswer', () => {
  const acceptedValues = ['Austerlitz', "bataille d'Austerlitz", 'bataille des Trois Empereurs'];

  it('accepte une correspondance exacte (après normalisation)', () => {
    expect(matchFreeTextAnswer('austerlitz', acceptedValues)).toEqual({
      isCorrect: true,
      matchedVia: 'exact',
    });
    expect(matchFreeTextAnswer('  AUSTERLITZ  ', acceptedValues)).toEqual({
      isCorrect: true,
      matchedVia: 'exact',
    });
  });

  it('accepte une variante avec article initial différent', () => {
    expect(matchFreeTextAnswer("l'Austerlitz", acceptedValues).isCorrect).toBe(true);
  });

  it('accepte une faute de frappe tolérée par Levenshtein', () => {
    // "austerlitz" (10 caractères) -> seuil 2
    expect(matchFreeTextAnswer('austerlitzz', acceptedValues)).toEqual({
      isCorrect: true,
      matchedVia: 'levenshtein',
    });
  });

  it('rejette une faute de frappe hors tolérance', () => {
    expect(matchFreeTextAnswer('aust', acceptedValues).isCorrect).toBe(false);
  });

  it('rejette une réponse totalement différente', () => {
    expect(matchFreeTextAnswer('Waterloo', acceptedValues)).toEqual({
      isCorrect: false,
      matchedVia: 'none',
    });
  });

  it('ne tolère aucune faute de frappe sous 4 caractères normalisés', () => {
    // "de" -> normalisé vide car "de" est lui-même un article initial ;
    // testons plutôt un mot court non-article.
    expect(matchFreeTextAnswer('abd', ['abc'])).toEqual({ isCorrect: false, matchedVia: 'none' });
  });
});
