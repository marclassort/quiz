<script setup lang="ts">
import { ref } from 'vue';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import RouteProgress from '@/features/quiz/components/RouteProgress.vue';

const swatches = [
  { label: 'Fond', swatchClass: 'bg-bg' },
  { label: 'Surface', swatchClass: 'bg-surface' },
  { label: 'Encre', swatchClass: 'bg-ink' },
  { label: 'Encre atténuée', swatchClass: 'bg-ink-muted' },
  { label: 'Accent primaire', swatchClass: 'bg-accent-primary' },
  { label: 'Accent secondaire', swatchClass: 'bg-accent-secondary' },
  { label: 'Succès', swatchClass: 'bg-success' },
  { label: 'Erreur', swatchClass: 'bg-error' },
];

const inputValue = ref('');
</script>

<template>
  <section class="space-y-12">
    <h1 class="font-display text-2xl font-bold">Styleguide</h1>

    <div>
      <h2 class="text-lg font-semibold">Couleurs</h2>
      <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="swatch in swatches" :key="swatch.label">
          <div class="h-16 rounded-lg border border-hairline" :class="swatch.swatchClass" />
          <p class="mt-1 text-xs text-ink-muted">{{ swatch.label }}</p>
        </div>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">Typographie</h2>
      <p class="font-display mt-3 text-3xl font-bold">Fraunces — affichage</p>
      <p class="mt-2 text-base">Public Sans — texte courant, pour tout le reste de l'interface.</p>
      <p class="font-data mt-2 text-2xl tabular-nums">1 234 567 — Space Grotesk</p>
    </div>

    <div>
      <h2 class="text-lg font-semibold">Boutons</h2>
      <div class="mt-3 flex flex-wrap gap-3">
        <BaseButton variant="primary">Primaire</BaseButton>
        <BaseButton variant="secondary">Secondaire</BaseButton>
        <BaseButton variant="danger">Danger</BaseButton>
        <BaseButton variant="primary" disabled>Désactivé</BaseButton>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">Champ</h2>
      <div class="mt-3 max-w-sm">
        <BaseInput v-model="inputValue" label="Exemple de champ" />
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">Alertes</h2>
      <div class="mt-3 space-y-3">
        <BaseAlert variant="success">Message de succès.</BaseAlert>
        <BaseAlert variant="error">Message d'erreur.</BaseAlert>
        <BaseAlert variant="info">Message d'information.</BaseAlert>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">Route de progression (élément signature)</h2>
      <div class="mt-3 max-w-sm space-y-4">
        <RouteProgress :current="1" :total="8" />
        <RouteProgress :current="4" :total="8" />
        <RouteProgress :current="8" :total="8" />
      </div>
    </div>
  </section>
</template>
