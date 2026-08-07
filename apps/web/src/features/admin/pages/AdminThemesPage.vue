<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { createThemeSchema } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import {
  type AdminTheme,
  useAdminThemesQuery,
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useUpdateThemeMutation,
} from '../api/themes';

const { t } = useI18n();
const { data: themes, status, error } = useAdminThemesQuery();
const { mutateAsync: createTheme, isLoading: isCreating } = useCreateThemeMutation();
const { mutateAsync: updateTheme, isLoading: isUpdating } = useUpdateThemeMutation();
const { mutateAsync: deleteTheme } = useDeleteThemeMutation();

interface FormState {
  slug: string;
  name: string;
  description: string;
  position: number;
}

function emptyForm(): FormState {
  return { slug: '', name: '', description: '', position: (themes.value?.length ?? 0) + 1 };
}

const editingId = ref<string | null>(null);
const showCreateForm = ref(false);
const form = ref<FormState>(emptyForm());
const formError = ref<string | null>(null);

function startCreate() {
  editingId.value = null;
  form.value = emptyForm();
  formError.value = null;
  showCreateForm.value = true;
}

function startEdit(theme: AdminTheme) {
  showCreateForm.value = false;
  editingId.value = theme.id;
  formError.value = null;
  form.value = {
    slug: theme.slug,
    name: theme.name,
    description: theme.description,
    position: theme.position,
  };
}

function cancelForm() {
  editingId.value = null;
  showCreateForm.value = false;
  formError.value = null;
}

async function onSubmit() {
  formError.value = null;
  const parsed = createThemeSchema.safeParse(form.value);
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('admin.themes.invalidForm');
    return;
  }

  try {
    if (editingId.value) {
      await updateTheme({ id: editingId.value, input: parsed.data });
    } else {
      await createTheme(parsed.data);
    }
    cancelForm();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

const deleteError = ref<string | null>(null);

async function onDelete(theme: AdminTheme) {
  deleteError.value = null;
  try {
    await deleteTheme(theme.id);
  } catch (err) {
    deleteError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

const isSaving = computed(() => isCreating.value || isUpdating.value);
</script>

<template>
  <section>
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-bold">{{ $t('admin.themes.title') }}</h1>
      <BaseButton v-if="!showCreateForm" type="button" @click="startCreate">
        {{ $t('admin.themes.create') }}
      </BaseButton>
    </div>

    <BaseAlert v-if="deleteError" variant="error" role="alert" class="mt-4">
      {{ deleteError }}
    </BaseAlert>

    <form
      v-if="showCreateForm"
      class="mt-4 space-y-3 rounded-lg border border-hairline p-4"
      novalidate
      @submit.prevent="onSubmit"
    >
      <BaseInput v-model="form.slug" :label="$t('admin.themes.fields.slug')" />
      <BaseInput v-model="form.name" :label="$t('admin.themes.fields.name')" />
      <BaseInput v-model="form.description" :label="$t('admin.themes.fields.description')" />
      <BaseInput
        v-model="form.position"
        type="number"
        :label="$t('admin.themes.fields.position')"
      />
      <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
        {{ formError }}
      </BaseAlert>
      <div class="flex gap-2">
        <BaseButton type="submit" :disabled="isSaving">{{ $t('admin.themes.save') }}</BaseButton>
        <BaseButton type="button" variant="secondary" @click="cancelForm">
          {{ $t('admin.themes.cancel') }}
        </BaseButton>
      </div>
    </form>

    <LoadingSpinner v-if="status === 'pending'" :label="$t('admin.themes.loading')" class="mt-6" />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert" class="mt-6">
      {{ error?.message ?? $t('admin.themes.loadError') }}
    </BaseAlert>

    <ul v-else-if="themes" class="mt-6 space-y-3">
      <li v-for="theme in themes" :key="theme.id" class="rounded-lg border border-hairline p-4">
        <template v-if="editingId === theme.id">
          <form class="space-y-3" novalidate @submit.prevent="onSubmit">
            <BaseInput v-model="form.slug" :label="$t('admin.themes.fields.slug')" />
            <BaseInput v-model="form.name" :label="$t('admin.themes.fields.name')" />
            <BaseInput v-model="form.description" :label="$t('admin.themes.fields.description')" />
            <BaseInput
              v-model="form.position"
              type="number"
              :label="$t('admin.themes.fields.position')"
            />
            <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
              {{ formError }}
            </BaseAlert>
            <div class="flex gap-2">
              <BaseButton type="submit" :disabled="isSaving">{{
                $t('admin.themes.save')
              }}</BaseButton>
              <BaseButton type="button" variant="secondary" @click="cancelForm">
                {{ $t('admin.themes.cancel') }}
              </BaseButton>
            </div>
          </form>
        </template>
        <template v-else>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold">{{ theme.name }}</h2>
              <p class="text-sm text-ink-muted">{{ theme.description }}</p>
              <p class="mt-1 text-xs text-ink-muted">{{ theme.slug }} · #{{ theme.position }}</p>
            </div>
            <div class="flex flex-none gap-2">
              <BaseButton type="button" variant="secondary" @click="startEdit(theme)">
                {{ $t('admin.themes.edit') }}
              </BaseButton>
              <BaseButton type="button" variant="danger" @click="onDelete(theme)">
                {{ $t('admin.themes.delete') }}
              </BaseButton>
            </div>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>
