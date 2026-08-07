<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import { useLogoutMutation, useMeQuery } from '@/features/auth/api/auth';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
useMeQuery();
const { mutate: logout } = useLogoutMutation();
</script>

<template>
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:shadow-1"
  >
    {{ $t('nav.skipToContent') }}
  </a>

  <header class="border-b border-hairline">
    <nav
      class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-3"
      aria-label="Navigation principale"
    >
      <RouterLink :to="{ name: 'home' }" class="font-display text-lg font-bold text-ink">
        {{ $t('app.title') }}
      </RouterLink>

      <ul class="flex flex-wrap items-center gap-4 text-sm font-medium text-ink-muted">
        <li>
          <RouterLink :to="{ name: 'leaderboard' }" class="hover:text-accent-primary">{{
            $t('nav.leaderboard')
          }}</RouterLink>
        </li>
        <template v-if="authStore.isAuthenticated">
          <li v-if="authStore.isAdmin">
            <RouterLink :to="{ name: 'admin' }" class="hover:text-accent-primary">{{
              $t('nav.admin')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'profile' }" class="hover:text-accent-primary">{{
              $t('nav.profile')
            }}</RouterLink>
          </li>
          <li>
            <BaseButton variant="secondary" @click="logout()">{{ $t('nav.logout') }}</BaseButton>
          </li>
        </template>
        <template v-else>
          <li>
            <RouterLink :to="{ name: 'login' }" class="hover:text-accent-primary">{{
              $t('nav.login')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'register' }">
              <BaseButton>{{ $t('nav.register') }}</BaseButton>
            </RouterLink>
          </li>
        </template>
      </ul>
    </nav>
  </header>

  <main id="main-content" class="mx-auto max-w-4xl px-4 py-8">
    <RouterView />
  </main>

  <footer class="border-t border-hairline">
    <div class="mx-auto flex max-w-4xl flex-wrap gap-4 px-4 py-6 text-sm text-ink-muted">
      <RouterLink :to="{ name: 'legal-notice' }" class="hover:text-accent-primary">{{
        $t('footer.legalNotice')
      }}</RouterLink>
      <RouterLink :to="{ name: 'privacy-policy' }" class="hover:text-accent-primary">{{
        $t('footer.privacyPolicy')
      }}</RouterLink>
      <RouterLink :to="{ name: 'contact' }" class="hover:text-accent-primary">{{
        $t('footer.contact')
      }}</RouterLink>
    </div>
  </footer>
</template>
