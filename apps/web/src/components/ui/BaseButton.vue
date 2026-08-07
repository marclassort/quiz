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
    class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
    :class="{
      'bg-blue-700 text-white hover:bg-blue-800': variant === 'primary',
      'bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50':
        variant === 'secondary',
      'bg-red-700 text-white hover:bg-red-800': variant === 'danger',
    }"
  >
    <slot />
  </button>
</template>
