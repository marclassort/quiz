<script setup lang="ts">
import { computed } from 'vue';
import type { QuizDifficulty } from '@quiz/shared';

const props = defineProps<{ difficulty: QuizDifficulty }>();

const levels: Record<QuizDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
const filled = computed(() => levels[props.difficulty]);
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span class="flex gap-0.5" aria-hidden="true">
      <span
        v-for="dot in 3"
        :key="dot"
        class="h-2 w-2 rounded-full"
        :class="dot <= filled ? 'bg-ink' : 'border border-hairline bg-surface'"
      />
    </span>
    <span>{{ $t(`quiz.difficulty.${difficulty}`) }}</span>
  </span>
</template>
