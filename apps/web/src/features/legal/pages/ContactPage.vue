<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-bold">{{ $t('legal.contact.title') }}</h1>
    <p class="mt-2 text-slate-700">{{ $t('legal.contact.text') }}</p>
    <p class="mt-2 text-lg font-medium">{{ $t('legal.contact.emailPlaceholder') }}</p>

    <BaseAlert variant="info" class="mt-6">
      {{ $t('legal.contact.placeholderNotice') }}
    </BaseAlert>
  </section>
</template>
