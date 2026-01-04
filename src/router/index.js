import { createRouter, createWebHistory } from 'vue-router';
import FileUpload from '../components/upload/FileUpload.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: FileUpload,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
