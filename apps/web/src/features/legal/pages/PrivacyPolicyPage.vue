<script setup lang="ts"></script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-bold">{{ $t('legal.privacy.title') }}</h1>
    <p class="mt-2 text-slate-600">{{ $t('legal.privacy.intro') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.controllerTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.controllerText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.dataTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.dataAccount') }}</p>
    <p class="mt-2 text-slate-700">{{ $t('legal.privacy.dataAnonymous') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.purposeTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.purposeText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.cookiesTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.cookiesText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.retentionTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.retentionText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.rightsTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.rightsText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.recipientsTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.recipientsText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.securityTitle') }}</h2>
    <p class="mt-1 text-slate-700">{{ $t('legal.privacy.securityText') }}</p>

    <h2 class="mt-6 text-lg font-semibold">{{ $t('legal.privacy.contactTitle') }}</h2>
    <p class="mt-1 text-slate-700">
      {{ $t('legal.privacy.contactText') }}
      <RouterLink :to="{ name: 'contact' }" class="text-blue-700 hover:underline">{{
        $t('footer.contact')
      }}</RouterLink>
    </p>
  </section>
</template>
