<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { updateMeSchema } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import { useMeQuery } from '@/features/auth/api/auth';
import { exportMe, useDeleteMeMutation, useMyStatsQuery, useUpdateMeMutation } from '../api/me';

const { t } = useI18n();
const router = useRouter();

const { data: me, status: meStatus, error: meError } = useMeQuery();
const { data: stats, status: statsStatus } = useMyStatsQuery();
const { mutateAsync: updateMe, isLoading: isSaving } = useUpdateMeMutation();
const { mutateAsync: deleteMe, isLoading: isDeleting } = useDeleteMeMutation();

const displayName = ref('');
const excludedFromLeaderboard = ref(false);
const formError = ref<string | null>(null);
const savedMessage = ref<string | null>(null);

// Réinitialise le formulaire dès que /me est chargé (ou revalidé).
watchEffect(() => {
  if (me.value) {
    displayName.value = me.value.displayName;
    excludedFromLeaderboard.value = me.value.excludedFromLeaderboard;
  }
});

const accuracyLabel = (accuracy: number) => `${Math.round(accuracy * 100)}%`;

async function onSubmit() {
  formError.value = null;
  savedMessage.value = null;

  const parsed = updateMeSchema.safeParse({
    displayName: displayName.value,
    excludedFromLeaderboard: excludedFromLeaderboard.value,
  });
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('profile.invalidForm');
    return;
  }

  try {
    await updateMe(parsed.data);
    savedMessage.value = t('profile.saved');
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('common.genericError');
  }
}

const isExporting = ref(false);
const exportError = ref<string | null>(null);

async function onExport() {
  exportError.value = null;
  isExporting.value = true;
  try {
    const data = await exportMe();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mes-donnees.json';
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    exportError.value = error instanceof ApiError ? error.message : t('profile.exportError');
  } finally {
    isExporting.value = false;
  }
}

const showDeleteConfirm = ref(false);
const deleteError = ref<string | null>(null);

async function onDeleteConfirmed() {
  deleteError.value = null;
  try {
    await deleteMe();
    await router.push({ name: 'home' });
  } catch (error) {
    deleteError.value = error instanceof ApiError ? error.message : t('profile.deleteError');
  }
}
</script>

<template>
  <section class="mx-auto max-w-xl">
    <h1 class="font-display text-2xl font-bold">{{ $t('profile.title') }}</h1>

    <LoadingSpinner v-if="meStatus === 'pending'" :label="$t('profile.loading')" />
    <BaseAlert v-else-if="meStatus === 'error'" variant="error" role="alert">
      {{ meError?.message ?? $t('profile.loadError') }}
    </BaseAlert>

    <template v-else-if="me">
      <p class="mt-1 text-sm text-ink-muted">{{ me.email }}</p>

      <div class="mt-6">
        <h2 class="text-lg font-semibold">{{ $t('profile.statsTitle') }}</h2>
        <LoadingSpinner v-if="statsStatus === 'pending'" :label="$t('profile.loading')" />
        <dl
          v-else-if="stats"
          class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-muted sm:grid-cols-3"
        >
          <div>
            <dt class="font-medium">{{ $t('profile.stats.totalScore') }}</dt>
            <dd class="font-data tabular-nums">{{ stats.totalScore }}</dd>
          </div>
          <div>
            <dt class="font-medium">{{ $t('profile.stats.quizzesCompleted') }}</dt>
            <dd class="font-data tabular-nums">{{ stats.quizzesCompleted }}</dd>
          </div>
          <div>
            <dt class="font-medium">{{ $t('profile.stats.accuracy') }}</dt>
            <dd class="font-data tabular-nums">{{ accuracyLabel(stats.averageAccuracy) }}</dd>
          </div>
        </dl>
        <RouterLink
          :to="{ name: 'profile-history' }"
          class="mt-3 inline-block text-sm font-medium text-accent-primary hover:underline"
        >
          {{ $t('profile.viewHistory') }}
        </RouterLink>
      </div>

      <form class="mt-8 space-y-4" novalidate @submit.prevent="onSubmit">
        <h2 class="text-lg font-semibold">{{ $t('profile.settingsTitle') }}</h2>

        <BaseInput
          v-model="displayName"
          :label="$t('profile.displayNameLabel')"
          autocomplete="nickname"
        />

        <label class="flex items-start gap-2 text-sm text-ink-muted">
          <input
            v-model="excludedFromLeaderboard"
            type="checkbox"
            class="mt-0.5 h-4 w-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
          />
          <span>{{ $t('profile.excludeFromLeaderboard') }}</span>
        </label>

        <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
          {{ formError }}
        </BaseAlert>
        <BaseAlert v-if="savedMessage" variant="success" role="status" aria-live="polite">
          {{ savedMessage }}
        </BaseAlert>

        <BaseButton type="submit" :disabled="isSaving">
          {{ isSaving ? $t('profile.saving') : $t('profile.save') }}
        </BaseButton>
      </form>

      <div class="mt-8 border-t border-hairline pt-6">
        <h2 class="text-lg font-semibold">{{ $t('profile.dataTitle') }}</h2>
        <p class="mt-1 text-sm text-ink-muted">{{ $t('profile.exportDescription') }}</p>
        <BaseAlert v-if="exportError" variant="error" role="alert" class="mt-2" aria-live="polite">
          {{ exportError }}
        </BaseAlert>
        <BaseButton
          type="button"
          variant="secondary"
          class="mt-3"
          :disabled="isExporting"
          @click="onExport"
        >
          {{ isExporting ? $t('profile.exporting') : $t('profile.export') }}
        </BaseButton>
      </div>

      <div class="mt-8 border-t border-hairline pt-6">
        <h2 class="text-lg font-semibold text-error">{{ $t('profile.dangerZoneTitle') }}</h2>
        <p class="mt-1 text-sm text-ink-muted">{{ $t('profile.deleteDescription') }}</p>
        <BaseAlert v-if="deleteError" variant="error" role="alert" class="mt-2" aria-live="polite">
          {{ deleteError }}
        </BaseAlert>

        <BaseButton
          v-if="!showDeleteConfirm"
          type="button"
          variant="danger"
          class="mt-3"
          @click="showDeleteConfirm = true"
        >
          {{ $t('profile.deleteAccount') }}
        </BaseButton>
        <template v-else>
          <BaseAlert variant="error" class="mt-3">{{
            $t('profile.deleteConfirmPrompt')
          }}</BaseAlert>
          <div class="mt-3 flex gap-2">
            <BaseButton
              type="button"
              variant="danger"
              :disabled="isDeleting"
              @click="onDeleteConfirmed"
            >
              {{ isDeleting ? $t('profile.deleting') : $t('profile.deleteConfirm') }}
            </BaseButton>
            <BaseButton type="button" variant="secondary" @click="showDeleteConfirm = false">
              {{ $t('profile.deleteCancel') }}
            </BaseButton>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>
