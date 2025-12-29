import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { setupNaive } from './plugins/naive';
import './styles/global.css';

const app = createApp(App);
setupNaive(app);
app.use(createPinia()).use(router).mount('#app');
