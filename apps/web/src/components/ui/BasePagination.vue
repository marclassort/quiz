<script setup lang="ts">
import BaseButton from './BaseButton.vue';

const props = defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ 'update:page': [page: number] }>();
</script>

<template>
  <nav class="flex items-center gap-3 text-sm text-slate-600" :aria-label="$t('pagination.label')">
    <BaseButton
      type="button"
      variant="secondary"
      :disabled="props.page <= 1"
      @click="emit('update:page', props.page - 1)"
    >
      {{ $t('pagination.previous') }}
    </BaseButton>
    <span>{{ $t('pagination.status', { page: props.page, totalPages: props.totalPages }) }}</span>
    <BaseButton
      type="button"
      variant="secondary"
      :disabled="props.page >= props.totalPages"
      @click="emit('update:page', props.page + 1)"
    >
      {{ $t('pagination.next') }}
    </BaseButton>
  </nav>
</template>
