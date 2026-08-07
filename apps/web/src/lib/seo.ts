import { onScopeDispose, watchEffect } from 'vue';

interface SeoOptions {
  title: () => string | undefined;
  description: () => string | undefined;
  jsonLd?: () => Record<string, unknown> | undefined;
}

const META_DESCRIPTION_ID = 'seo-meta-description';
const JSON_LD_ID = 'seo-json-ld';

/**
 * SEO minimal (claude.md §8) : titre + meta description par page, données
 * structurées Quiz schema.org sur la fiche de présentation. Pas de
 * bibliothèque dédiée pour ça seul (SPA sans SSR : de toute façon peu
 * crawlable sans prérendu, cf. §8) — quelques lignes suffisent.
 */
export function useSeoMeta(options: SeoOptions): void {
  watchEffect(() => {
    const title = options.title();
    if (title) {
      document.title = title;
    }

    const description = options.description();
    let meta = document.querySelector<HTMLMetaElement>(`meta#${META_DESCRIPTION_ID}`);
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.id = META_DESCRIPTION_ID;
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    } else {
      meta?.remove();
    }

    const jsonLd = options.jsonLd?.();
    let script = document.querySelector<HTMLScriptElement>(`script#${JSON_LD_ID}`);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = JSON_LD_ID;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else {
      script?.remove();
    }
  });

  onScopeDispose(() => {
    document.querySelector(`meta#${META_DESCRIPTION_ID}`)?.remove();
    document.querySelector(`script#${JSON_LD_ID}`)?.remove();
  });
}
