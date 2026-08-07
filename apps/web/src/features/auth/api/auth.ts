import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type { LoginInput, Me, RegisterInput } from '@quiz/shared';

import { apiFetch } from '@/lib/http';
import { useAuthStore } from '@/stores/auth';

async function fetchMe(): Promise<Me | null> {
  try {
    return await apiFetch<Me>('/me');
  } catch {
    // 401 = personne connectée : ce n'est pas une erreur applicative pour
    // l'UI (parcours anonyme normal), donc on résout à `null` plutôt que
    // de propager une erreur qui déclencherait un état "error" affiché.
    return null;
  }
}

/** Appelée une fois au montage de App.vue pour établir l'état de session initial. */
export function useMeQuery() {
  const authStore = useAuthStore();

  return useQuery({
    key: ['me'],
    query: async () => {
      const me = await fetchMe();
      authStore.setUser(me ? { id: me.id, displayName: me.displayName, role: me.role } : null);
      return me;
    },
  });
}

export function useLoginMutation() {
  const authStore = useAuthStore();
  const queryCache = useQueryCache();

  return useMutation({
    mutation: (input: LoginInput) =>
      apiFetch<{ user: { id: string; displayName: string; role: 'USER' | 'ADMIN' } }>(
        '/auth/login',
        {
          method: 'POST',
          body: input,
          skipAuthRetry: true,
        },
      ),
    onSuccess({ user }) {
      authStore.setUser(user);
      queryCache.invalidateQueries({ key: ['me'] });
    },
  });
}

export function useRegisterMutation() {
  const authStore = useAuthStore();
  const queryCache = useQueryCache();

  return useMutation({
    mutation: (input: RegisterInput) =>
      apiFetch<{ user: { id: string; displayName: string; role: 'USER' | 'ADMIN' } }>(
        '/auth/register',
        { method: 'POST', body: input, skipAuthRetry: true },
      ),
    onSuccess({ user }) {
      authStore.setUser(user);
      queryCache.invalidateQueries({ key: ['me'] });
    },
  });
}

export function useLogoutMutation() {
  const authStore = useAuthStore();
  const queryCache = useQueryCache();

  return useMutation({
    mutation: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess() {
      authStore.setUser(null);
      queryCache.invalidateQueries({ key: ['me'] });
    },
  });
}
