import { watch } from 'vue';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/quiz/pages/HomePage.vue'),
  },
  {
    path: '/themes/:slug',
    name: 'theme',
    component: () => import('@/features/quiz/pages/ThemePage.vue'),
    props: true,
  },
  {
    path: '/quiz/:slug',
    name: 'quiz-detail',
    component: () => import('@/features/quiz/pages/QuizDetailPage.vue'),
    props: true,
  },
  {
    path: '/quiz/:slug/play',
    name: 'quiz-play',
    component: () => import('@/features/quiz/pages/QuizPlayPage.vue'),
    props: true,
  },
  {
    path: '/quiz/:slug/result/:attemptId',
    name: 'quiz-result',
    component: () => import('@/features/quiz/pages/QuizResultPage.vue'),
    props: true,
  },
  {
    path: '/classement',
    name: 'leaderboard',
    component: () => import('@/features/ranking/pages/LeaderboardPage.vue'),
  },
  {
    path: '/connexion',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
  },
  {
    path: '/inscription',
    name: 'register',
    component: () => import('@/features/auth/pages/RegisterPage.vue'),
  },
  {
    path: '/profil',
    name: 'profile',
    meta: { requiresAuth: true },
    component: () => import('@/features/profile/pages/ProfilePage.vue'),
  },
  {
    path: '/profil/historique',
    name: 'profile-history',
    meta: { requiresAuth: true },
    component: () => import('@/features/profile/pages/ProfileHistoryPage.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminDashboardPage.vue'),
  },
  {
    path: '/admin/themes',
    name: 'admin-themes',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminThemesPage.vue'),
  },
  {
    path: '/admin/quizzes',
    name: 'admin-quizzes',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminQuizzesPage.vue'),
  },
  {
    path: '/admin/quizzes/:id',
    name: 'admin-quiz-editor',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminQuizEditorPage.vue'),
    props: true,
  },
  {
    path: '/admin/quizzes/:id/preview',
    name: 'admin-quiz-preview',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminQuizPreviewPage.vue'),
    props: true,
  },
  {
    path: '/admin/questions/:id',
    name: 'admin-question-editor',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminQuestionEditorPage.vue'),
    props: true,
  },
  {
    path: '/admin/answer-reviews',
    name: 'admin-answer-reviews',
    meta: { requiresAdmin: true },
    component: () => import('@/features/admin/pages/AdminAnswerReviewsPage.vue'),
  },
  {
    path: '/mentions-legales',
    name: 'legal-notice',
    component: () => import('@/features/legal/pages/LegalNoticePage.vue'),
  },
  {
    path: '/confidentialite',
    name: 'privacy-policy',
    component: () => import('@/features/legal/pages/PrivacyPolicyPage.vue'),
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/features/legal/pages/ContactPage.vue'),
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: '/styleguide',
          name: 'styleguide',
          component: () => import('@/features/styleguide/pages/StyleguidePage.vue'),
        },
      ]
    : []),
] satisfies RouteRecordRaw[];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin && !to.meta.requiresAuth) {
    return;
  }

  const auth = useAuthStore();

  // Le premier appel GET /me (déclenché au montage de App.vue) est encore en
  // vol lors d'une navigation directe vers une route protégée (ex.
  // rechargement de page) : on attend sa résolution avant de trancher, pour
  // ne pas rediriger un utilisateur connecté par erreur pendant la
  // vérification initiale de session.
  if (!auth.hasCheckedSession) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => auth.hasCheckedSession,
        (checked) => {
          if (checked) {
            stop();
            resolve();
          }
        },
      );
    });
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' };
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});
