import { levenshteinDistance, levenshteinThreshold } from './levenshtein';
import { normalizeFreeText } from './normalize';

export type FreeTextMatchKind = 'exact' | 'levenshtein' | 'none';

export interface FreeTextMatchResult {
  isCorrect: boolean;
  matchedVia: FreeTextMatchKind;
}

/**
 * Pipeline complet de correction FREE_TEXT (claude.md §6.3) : normalisation,
 * comparaison exacte, puis tolérance Levenshtein dépendante de la longueur.
 * Ne fait aucun accès base de données ni appel LLM (§6.3 point 5) — pure et
 * facilement testable.
 */
export function matchFreeTextAnswer(
  submittedText: string,
  acceptedValues: string[],
): FreeTextMatchResult {
  const normalizedSubmission = normalizeFreeText(submittedText);
  const normalizedAccepted = acceptedValues.map(normalizeFreeText);

  if (normalizedAccepted.includes(normalizedSubmission)) {
    return { isCorrect: true, matchedVia: 'exact' };
  }

  const threshold = levenshteinThreshold(normalizedSubmission.length);
  if (threshold === 0) {
    return { isCorrect: false, matchedVia: 'none' };
  }

  const withinTolerance = normalizedAccepted.some(
    (accepted) => levenshteinDistance(normalizedSubmission, accepted) <= threshold,
  );

  return withinTolerance
    ? { isCorrect: true, matchedVia: 'levenshtein' }
    : { isCorrect: false, matchedVia: 'none' };
}
