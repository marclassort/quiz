import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

interface AuthenticatedUser {
  id: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null);
  /** Devient true une fois que le premier appel GET /me (succès ou échec) est
   * résolu, pour éviter tout flash de contenu "déconnecté" pendant la
   * vérification initiale de session. */
  const hasCheckedSession = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  function setUser(nextUser: AuthenticatedUser | null) {
    user.value = nextUser;
    hasCheckedSession.value = true;
  }

  return { user, hasCheckedSession, isAuthenticated, isAdmin, setUser };
});
