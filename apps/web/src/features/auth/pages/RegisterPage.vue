<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { registerSchema } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { ApiError } from '@/lib/http';
import { useRegisterMutation } from '../api/auth';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { mutateAsync: register, isLoading } = useRegisterMutation();

const email = ref('');
const displayName = ref('');
const password = ref('');
const formError = ref<string | null>(null);

async function onSubmit() {
  formError.value = null;

  const parsed = registerSchema.safeParse({
    email: email.value,
    displayName: displayName.value,
    password: password.value,
  });
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('auth.register.invalidForm');
    return;
  }

  try {
    await register(parsed.data);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined;
    await router.push(redirect ?? { name: 'home' });
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('common.genericError');
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm">
    <h1 class="font-display text-2xl font-bold">{{ $t('auth.register.title') }}</h1>
    <p class="mt-2 text-sm text-ink-muted">
      {{ $t('auth.register.subtitle') }}
    </p>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseInput
        v-model="email"
        type="email"
        :label="$t('auth.register.emailLabel')"
        autocomplete="email"
      />
      <BaseInput
        v-model="displayName"
        :label="$t('auth.register.displayNameLabel')"
        autocomplete="nickname"
      />
      <BaseInput
        v-model="password"
        type="password"
        :label="$t('auth.register.passwordLabel')"
        autocomplete="new-password"
      />

      <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
        {{ formError }}
      </BaseAlert>

      <BaseButton type="submit" :disabled="isLoading" class="w-full">
        {{ isLoading ? $t('auth.register.submitting') : $t('auth.register.submit') }}
      </BaseButton>
    </form>

    <p class="mt-4 text-sm text-ink-muted">
      {{ $t('auth.register.hasAccount') }}
      <RouterLink :to="{ name: 'login' }" class="font-medium text-accent-primary hover:underline">
        {{ $t('auth.register.loginLink') }}
      </RouterLink>
    </p>
  </section>
</template>
