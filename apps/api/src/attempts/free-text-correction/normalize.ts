/**
 * Normalisation d'une réponse FREE_TEXT (claude.md §6.3).
 *
 * Le texte liste l'ordre "diacritiques -> ponctuation -> espaces -> articles",
 * mais appliqué littéralement, la suppression de la ponctuation détruirait
 * l'apostrophe de "l'" / "d'" avant que ces articles puissent être reconnus
 * (ex. "l'Autriche" -> "lautriche", plus détectable comme "l' + Autriche").
 * On retire donc l'article initial (avec son apostrophe le cas échéant)
 * avant de supprimer le reste de la ponctuation — même résultat pour tout ce
 * qui n'est pas un article en tête de chaîne, et un retrait d'article qui
 * fonctionne réellement.
 */
const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;
const LEADING_ARTICLE_PATTERN = /^(?:les|le|la|de|[ld]['’])\s*/i;

export function normalizeFreeText(rawText: string): string {
  const trimmedLower = rawText.trim().toLowerCase();

  const withoutDiacritics = trimmedLower.normalize('NFD').replace(COMBINING_DIACRITICAL_MARKS, '');

  const withoutLeadingArticle = withoutDiacritics.replace(LEADING_ARTICLE_PATTERN, '');

  const withoutPunctuation = withoutLeadingArticle.replace(/[^\p{L}\p{N}\s]/gu, '');

  return withoutPunctuation.replace(/\s+/g, ' ').trim();
}
