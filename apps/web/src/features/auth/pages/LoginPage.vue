<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { loginSchema } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { ApiError } from '@/lib/http';
import { useLoginMutation } from '../api/auth';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { mutateAsync: login, isLoading } = useLoginMutation();

const email = ref('');
const password = ref('');
const formError = ref<string | null>(null);

async function onSubmit() {
  formError.value = null;

  const parsed = loginSchema.safeParse({ email: email.value, password: password.value });
  if (!parsed.success) {
    formError.value = t('auth.login.invalidForm');
    return;
  }

  try {
    await login(parsed.data);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined;
    await router.push(redirect ?? { name: 'home' });
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('common.genericError');
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm">
    <h1 class="font-display text-2xl font-bold">{{ $t('auth.login.title') }}</h1>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseInput
        v-model="email"
        type="email"
        :label="$t('auth.login.emailLabel')"
        autocomplete="email"
      />
      <BaseInput
        v-model="password"
        type="password"
        :label="$t('auth.login.passwordLabel')"
        autocomplete="current-password"
      />

      <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
        {{ formError }}
      </BaseAlert>

      <BaseButton type="submit" :disabled="isLoading" class="w-full">
        {{ isLoading ? $t('auth.login.submitting') : $t('auth.login.submit') }}
      </BaseButton>
    </form>

    <p class="mt-4 text-sm text-ink-muted">
      {{ $t('auth.login.noAccount') }}
      <RouterLink :to="{ name: 'register' }" class="font-medium text-accent-primary hover:underline">
        {{ $t('auth.login.registerLink') }}
      </RouterLink>
    </p>
  </section>
</template>
