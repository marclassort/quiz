<script setup lang="ts">
/**
 * Correction/statut : couleur ET icône ET texte (claude.md §8 — jamais la
 * couleur seule comme porteur d'information).
 */
withDefaults(defineProps<{ variant?: 'success' | 'error' | 'info' }>(), { variant: 'info' });
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-lg border p-4 text-sm"
    :class="{
      'border-success/30 bg-success/10 text-success-strong': variant === 'success',
      'border-error/30 bg-error/10 text-error-strong': variant === 'error',
      'border-accent-primary/30 bg-accent-primary/10 text-accent-primary-strong': variant === 'info',
    }"
  >
    <svg
      v-if="variant === 'success'"
      class="mt-0.5 h-5 w-5 flex-none text-success"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clip-rule="evenodd"
      />
    </svg>
    <svg
      v-else-if="variant === 'error'"
      class="mt-0.5 h-5 w-5 flex-none text-error"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clip-rule="evenodd"
      />
    </svg>
    <svg
      v-else
      class="mt-0.5 h-5 w-5 flex-none text-accent-primary"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clip-rule="evenodd"
      />
    </svg>
    <div>
      <slot />
    </div>
  </div>
</template>
