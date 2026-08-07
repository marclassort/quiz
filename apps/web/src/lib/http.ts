import type { ProblemDetails } from '@quiz/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Partial<ProblemDetails> | undefined;

  constructor(status: number, message: string, problem?: Partial<ProblemDetails>) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Empêche la tentative de refresh automatique (utilisé pour /auth/* lui-même). */
  skipAuthRetry?: boolean;
}

/**
 * Un seul refresh en vol à la fois, même si plusieurs requêtes échouent en
 * 401 simultanément (ex. plusieurs useQuery montés en même temps).
 */
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('refresh failed');
        }
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parseErrorBody(response: Response): Promise<Partial<ProblemDetails> | undefined> {
  try {
    return (await response.json()) as Partial<ProblemDetails>;
  } catch {
    return undefined;
  }
}

/**
 * Client HTTP minimal : cookies httpOnly envoyés systématiquement
 * (`credentials: 'include'`, nécessaire car apps/web et apps/api sont sur
 * des origines différentes en dev), et une tentative de rafraîchissement du
 * JWT d'accès (15 min, claude.md §5) avant d'abandonner sur un 401 — sans
 * quoi une session normale expirerait en pleine partie.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let response = await doFetch();

  if (response.status === 401 && !options.skipAuthRetry) {
    try {
      await refreshAccessToken();
      response = await doFetch();
    } catch {
      // Le refresh a échoué : on laisse la réponse 401 d'origine être traitée ci-dessous.
    }
  }

  if (!response.ok) {
    const problem = await parseErrorBody(response);
    throw new ApiError(
      response.status,
      // RFC 9457 : `title` est un intitulé générique de la classe d'erreur
      // ("Not Found"), `detail` est le message spécifique à l'occurrence
      // ("Thème introuvable.") — c'est ce dernier qui est utile à l'utilisateur.
      problem?.detail ?? problem?.title ?? `Erreur ${response.status}`,
      problem,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
