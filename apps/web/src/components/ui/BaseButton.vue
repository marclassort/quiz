<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger';
    type?: 'button' | 'submit';
    disabled?: boolean;
  }>(),
  { variant: 'primary', type: 'button', disabled: false },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
    :class="{
      'bg-accent-primary text-white hover:bg-accent-primary-strong': variant === 'primary',
      'bg-surface text-ink ring-1 ring-inset ring-hairline hover:bg-bg': variant === 'secondary',
      'bg-error text-white hover:bg-error-strong': variant === 'danger',
    }"
  >
    <slot />
  </button>
</template>
