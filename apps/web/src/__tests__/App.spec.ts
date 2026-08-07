import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import App from '../App.vue';
import { router } from '../router';
import { i18n } from '../i18n';

describe('App', () => {
  it("monte sans erreur et affiche la page d'accueil", async () => {
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, i18n],
      },
    });

    expect(wrapper.text()).toContain('Thèmes');
  });
});
