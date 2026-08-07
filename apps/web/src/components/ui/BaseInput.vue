<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    label: string;
    type?: string;
    error?: string;
    autocomplete?: string;
    maxlength?: number;
  }>(),
  { type: 'text', error: undefined, autocomplete: undefined, maxlength: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();

const inputId = useId();
const errorId = computed(() => (props.error ? `${inputId}-error` : undefined));

// v-model.number ne fonctionne pas sur un composant custom sans lire
// modelModifiers explicitement : on coerce nous-mêmes selon `type`, ce qui
// évite à chaque page appelante de le refaire. Un champ number vidé émet
// `null` plutôt que 0, pour les champs nullable côté API (ex.
// `timeLimitSeconds`) — 0 serait une valeur métier différente, pas "absent".
function onInput(event: Event) {
  const rawValue = (event.target as HTMLInputElement).value;
  if (props.type !== 'number') {
    emit('update:modelValue', rawValue);
    return;
  }
  emit('update:modelValue', rawValue === '' ? null : Number(rawValue));
}
</script>

<template>
  <div>
    <label :for="inputId" class="mb-1 block text-sm font-medium text-ink-muted">{{ label }}</label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="errorId"
      class="block w-full rounded-sm border-0 bg-surface px-3 py-2 text-ink ring-1 ring-inset ring-hairline placeholder:text-ink-muted focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent-primary"
      @input="onInput"
    />
    <p v-if="error" :id="errorId" class="mt-1 text-sm text-error">{{ error }}</p>
  </div>
</template>
