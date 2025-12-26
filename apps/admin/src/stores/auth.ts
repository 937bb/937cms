import { defineStore } from 'pinia';
import { clearToken, getToken, setToken } from '../lib/http';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
  }),
  actions: {
    setAccessToken(token: string) {
      this.token = token;
      setToken(token);
    },
    logout() {
      this.token = '';
      clearToken();
    },
  },
});
