<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="font-display text-2xl font-bold">{{ $t('legal.contact.title') }}</h1>
    <p class="mt-2 text-ink-muted">{{ $t('legal.contact.text') }}</p>
    <p class="mt-2 text-lg font-medium">{{ $t('legal.contact.emailPlaceholder') }}</p>

    <BaseAlert variant="info" class="mt-6">
      {{ $t('legal.contact.placeholderNotice') }}
    </BaseAlert>
  </section>
</template>
