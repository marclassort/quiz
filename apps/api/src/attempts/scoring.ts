/**
 * Correction des questions à choix : tout-ou-rien par défaut (claude.md
 * §6.2). Point d'extension pour un barème partiel : remplacer ce booléen par
 * un calcul de score fractionnaire (ex. proportion d'options correctes
 * cochées, moins pénalité pour les options incorrectes) sans changer la
 * signature appelante dans AttemptsService.
 */
export function isChoiceSelectionCorrect(
  correctChoiceIds: Set<string>,
  submittedChoiceIds: string[],
): boolean {
  if (submittedChoiceIds.length !== correctChoiceIds.size) {
    return false;
  }
  return submittedChoiceIds.every((id) => correctChoiceIds.has(id));
}

export interface SpeedBonusContext {
  speedBonusEnabled: boolean;
  timeLimitSeconds: number | null;
  questionCountInQuiz: number;
}

/**
 * Bonus de rapidité (claude.md §6.2) : +50% si répondu en moins d'un tiers du
 * temps imparti. `timeLimitSeconds` est défini au niveau du quiz (pas par
 * question, cf. §3) ; le "temps imparti" par question est donc dérivé en
 * divisant également entre les questions. Si le quiz n'a pas de limite de
 * temps, le bonus ne s'applique jamais, même si le flag est activé.
 */
export function computeSpeedBonusMultiplier(
  context: SpeedBonusContext,
  answerTimeMs: number,
): number {
  if (!context.speedBonusEnabled || !context.timeLimitSeconds || context.questionCountInQuiz <= 0) {
    return 1;
  }

  const timeBudgetMsPerQuestion = (context.timeLimitSeconds * 1000) / context.questionCountInQuiz;
  const oneThirdBudget = timeBudgetMsPerQuestion / 3;

  return answerTimeMs < oneThirdBudget ? 1.5 : 1;
}

export function computePointsEarned(
  isCorrect: boolean,
  questionPoints: number,
  speedBonusContext: SpeedBonusContext,
  answerTimeMs: number,
): number {
  if (!isCorrect) {
    return 0;
  }

  const multiplier = computeSpeedBonusMultiplier(speedBonusContext, answerTimeMs);
  return Math.round(questionPoints * multiplier);
}
