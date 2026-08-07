<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AnswerReviewStatus } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import {
  useAcceptAnswerReviewMutation,
  useAnswerReviewsQuery,
  useRejectAnswerReviewMutation,
} from '../api/answer-reviews';

const { t } = useI18n();
const statusFilter = ref<AnswerReviewStatus>('PENDING');
const page = ref(1);

const {
  data: reviewsPage,
  status,
  error,
} = useAnswerReviewsQuery(() => ({ status: statusFilter.value, page: page.value }));

const { mutateAsync: accept } = useAcceptAnswerReviewMutation();
const { mutateAsync: reject } = useRejectAnswerReviewMutation();
const actionError = ref<string | null>(null);

async function onAccept(id: string) {
  actionError.value = null;
  try {
    await accept(id);
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onReject(id: string) {
  actionError.value = null;
  try {
    await reject(id);
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-bold">{{ $t('admin.answerReviews.title') }}</h1>

    <label class="mt-4 block text-sm text-slate-700">
      {{ $t('admin.answerReviews.filterLabel') }}
      <select
        v-model="statusFilter"
        class="ml-2 rounded-md border-0 px-2 py-1 text-sm ring-1 ring-inset ring-slate-300"
      >
        <option value="PENDING">{{ $t('admin.answerReviews.status.PENDING') }}</option>
        <option value="ACCEPTED">{{ $t('admin.answerReviews.status.ACCEPTED') }}</option>
        <option value="REJECTED">{{ $t('admin.answerReviews.status.REJECTED') }}</option>
      </select>
    </label>

    <BaseAlert v-if="actionError" variant="error" role="alert" class="mt-4">
      {{ actionError }}
    </BaseAlert>

    <LoadingSpinner
      v-if="status === 'pending'"
      :label="$t('admin.answerReviews.loading')"
      class="mt-6"
    />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert" class="mt-6">
      {{ error?.message ?? $t('admin.answerReviews.loadError') }}
    </BaseAlert>

    <template v-else-if="reviewsPage">
      <p v-if="reviewsPage.items.length === 0" class="mt-6 text-slate-600">
        {{ $t('admin.answerReviews.empty') }}
      </p>
      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="review in reviewsPage.items"
          :key="review.id"
          class="rounded-lg border border-slate-200 p-4"
        >
          <p class="font-semibold">« {{ review.submittedText }} »</p>
          <p class="mt-1 text-sm text-slate-600">{{ review.question.statement }}</p>
          <p class="text-xs text-slate-500">
            {{ review.question.quiz.title }} ·
            {{ $t('admin.answerReviews.occurrences', { count: review.occurrences }) }}
          </p>
          <div v-if="review.status === 'PENDING'" class="mt-3 flex gap-2">
            <BaseButton type="button" @click="onAccept(review.id)">
              {{ $t('admin.answerReviews.accept') }}
            </BaseButton>
            <BaseButton type="button" variant="danger" @click="onReject(review.id)">
              {{ $t('admin.answerReviews.reject') }}
            </BaseButton>
          </div>
        </li>
      </ul>

      <BasePagination
        v-if="reviewsPage.totalPages > 1"
        class="mt-6"
        :page="reviewsPage.page"
        :total-pages="reviewsPage.totalPages"
        @update:page="page = $event"
      />
    </template>
  </section>
</template>
