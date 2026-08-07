export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[j - 1]! + 1, // insertion
          previousRow[j]! + 1, // suppression
          previousRow[j - 1]! + substitutionCost, // substitution
        ),
      );
    }
    previousRow = currentRow;
  }

  return previousRow[b.length]!;
}

/**
 * Seuil de tolérance dépendant de la longueur (claude.md §6.3) : pas de
 * tolérance sous 4 caractères, ≤1 pour 4-7, ≤2 pour 8-12, ≤3 au-delà. Basé
 * sur la longueur du texte normalisé soumis par le joueur (c'est lui qui
 * peut contenir une faute de frappe).
 */
export function levenshteinThreshold(normalizedSubmittedLength: number): number {
  if (normalizedSubmittedLength < 4) return 0;
  if (normalizedSubmittedLength <= 7) return 1;
  if (normalizedSubmittedLength <= 12) return 2;
  return 3;
}
