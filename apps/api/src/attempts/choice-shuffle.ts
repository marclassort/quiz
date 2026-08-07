/**
 * Ordre mélangé mais stable pour la durée de l'Attempt (claude.md §6.1) : pas
 * de table dédiée pour persister un ordre, donc un tri déterministe dérivé de
 * (attemptId, choiceId) — même Attempt => même ordre à chaque appel, sans
 * état supplémentaire à stocker.
 */
function djb2Hash(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

export function shuffleForAttempt<T extends { id: string }>(attemptId: string, items: T[]): T[] {
  return [...items].sort(
    (a, b) => djb2Hash(`${attemptId}:${a.id}`) - djb2Hash(`${attemptId}:${b.id}`),
  );
}
