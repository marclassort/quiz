<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-bold">{{ $t('legal.notice.title') }}</h1>

    <BaseAlert variant="info" class="mt-4">
      {{ $t('legal.notice.placeholderNotice') }}
    </BaseAlert>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.notice.editorTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.notice.editorText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.notice.hostTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.notice.hostText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.notice.ipTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.notice.ipText') }}</p>
  </section>
</template>
