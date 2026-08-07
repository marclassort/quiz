import {
  computePointsEarned,
  computeSpeedBonusMultiplier,
  isChoiceSelectionCorrect,
} from './scoring';

describe('isChoiceSelectionCorrect', () => {
  it('accepte un ensemble exactement correct (SINGLE_CHOICE)', () => {
    expect(isChoiceSelectionCorrect(new Set(['a']), ['a'])).toBe(true);
  });

  it('rejette une réponse incomplète (MULTIPLE_CHOICE)', () => {
    expect(isChoiceSelectionCorrect(new Set(['a', 'b']), ['a'])).toBe(false);
  });

  it('rejette une réponse avec une option en trop', () => {
    expect(isChoiceSelectionCorrect(new Set(['a']), ['a', 'b'])).toBe(false);
  });

  it('rejette un ensemble vide si une réponse était attendue', () => {
    expect(isChoiceSelectionCorrect(new Set(['a']), [])).toBe(false);
  });
});

describe('computeSpeedBonusMultiplier', () => {
  const baseContext = { speedBonusEnabled: true, timeLimitSeconds: 300, questionCountInQuiz: 10 };
  // 300s / 10 questions = 30s/question, tiers = 10s = 10000ms

  it('applique le bonus si répondu en moins d’un tiers du temps imparti', () => {
    expect(computeSpeedBonusMultiplier(baseContext, 5_000)).toBe(1.5);
  });

  it("n'applique pas le bonus au-delà d'un tiers du temps imparti", () => {
    expect(computeSpeedBonusMultiplier(baseContext, 15_000)).toBe(1);
  });

  it('reste à 1 si le bonus est désactivé', () => {
    expect(computeSpeedBonusMultiplier({ ...baseContext, speedBonusEnabled: false }, 1_000)).toBe(
      1,
    );
  });

  it('reste à 1 si le quiz n’a pas de limite de temps', () => {
    expect(computeSpeedBonusMultiplier({ ...baseContext, timeLimitSeconds: null }, 1_000)).toBe(1);
  });
});

describe('computePointsEarned', () => {
  const context = { speedBonusEnabled: true, timeLimitSeconds: 300, questionCountInQuiz: 10 };

  it('renvoie 0 si la réponse est incorrecte', () => {
    expect(computePointsEarned(false, 5, context, 1_000)).toBe(0);
  });

  it('renvoie les points de base si correct sans bonus', () => {
    expect(computePointsEarned(true, 5, { ...context, speedBonusEnabled: false }, 1_000)).toBe(5);
  });

  it('applique le bonus de rapidité arrondi', () => {
    expect(computePointsEarned(true, 5, context, 1_000)).toBe(8); // 5 * 1.5 = 7.5 -> 8
  });
});
