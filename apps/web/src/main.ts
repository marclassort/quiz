import './assets/main.css';

import { PiniaColada } from '@pinia/colada';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';

const app = createApp(App);

app.use(createPinia());
app.use(PiniaColada, {});
app.use(router);
app.use(i18n);

app.mount('#app');
