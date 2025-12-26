<template>
  <div class="admin-login-page">
    <!-- 背景装饰 -->
    <div class="login-bg-decoration">
      <div class="decoration-circle decoration-circle-1"></div>
      <div class="decoration-circle decoration-circle-2"></div>
      <div class="decoration-circle decoration-circle-3"></div>
    </div>

    <!-- 登录容器 -->
    <div class="login-wrapper">
      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 标题区域 -->
        <div class="login-header">
          <div class="logo-area">
            <img src="../../assets/937cmsFavicon.png" alt="937 CMS" class="logo-icon" />
            <h1 class="login-title">937 CMS</h1>
          </div>
          <p class="login-subtitle">管理后台登录</p>
        </div>

        <!-- 表单区域 -->
        <div class="login-form-wrapper">
          <n-form ref="formRef" :model="model" :rules="rules" label-placement="top">
            <n-form-item label="用户名" path="username">
              <n-input
                v-model:value="model.username"
                placeholder="请输入用户名"
                clearable
                @keyup.enter="onLogin"
              >
                <template #prefix>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item label="密码" path="password">
              <n-input
                v-model:value="model.password"
                type="password"
                placeholder="请输入密码"
                show-password-on="click"
                clearable
                @keyup.enter="onLogin"
              >
                <template #prefix>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </template>
              </n-input>
            </n-form-item>

            <n-button
              type="primary"
              :loading="loading"
              block
              size="large"
              class="login-btn"
              @click="onLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </n-button>
          </n-form>
        </div>

        <!-- 底部信息 -->
        <div class="login-footer">
          <p class="footer-text">937 CMS 管理系统</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '../../lib/http';
import { useAuthStore } from '../../stores/auth';
import { getSetupStatusCached } from '../../lib/setup-status';

const msg = useMessage();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const formRef = ref<FormInst | null>(null);
const loading = ref(false);

const model = reactive({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: ['blur', 'input'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }],
};

async function onLogin() {
  const status = await getSetupStatusCached();
  if (!status.configured || status.needsRestart) {
    msg.warning('系统尚未完成初始化（或需要重启 API），请先到初始化页面');
    router.push('/setup');
    return;
  }

  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;

  loading.value = true;
  try {
    const res = await http.post('/admin/auth/login', model);
    const token = String(res.data?.accessToken || '');
    if (!token) throw new Error('no token');
    auth.setAccessToken(token);
    msg.success('登录成功');
    const redirect = String(route.query.redirect || '/dashboard');
    router.push(redirect);
  } catch (e: any) {
    const text = e?.response?.data?.message || e?.message || '登录失败';
    msg.error(String(text));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%);
  overflow: hidden;
}

/* 背景装饰 */
.login-bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.2;
}

.decoration-circle-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #ff6b6b, #ff9a56);
  top: -100px;
  left: -100px;
  animation: float 8s ease-in-out infinite;
}

.decoration-circle-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  bottom: -50px;
  right: -50px;
  animation: float 10s ease-in-out infinite reverse;
}

.decoration-circle-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #ff6b6b, #ff9a56);
  top: 50%;
  right: 10%;
  animation: float 9s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(30px);
  }
}

@keyframes glow {
  0%,
  100% {
    filter: drop-shadow(0 0 5px rgba(255, 154, 86, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(255, 154, 86, 0.6));
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 登录容器 */
.login-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 登录卡片 */
.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 48px 40px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  animation: slideUp 0.6s ease-out;
}

/* 标题区域 */
.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 4px 15px rgba(255, 154, 86, 0.3);
  animation: glow 3s ease-in-out infinite;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ff9a56, #ff6a88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse 2s ease-in-out infinite;
}

.login-subtitle {
  font-size: 14px;
  color: #6c757d;
  margin: 8px 0 0 0;
}

/* 表单区域 */
.login-form-wrapper {
  margin-bottom: 24px;
}

:deep(.n-form-item) {
  margin-bottom: 20px;
}

:deep(.n-form-item__label) {
  font-weight: 600;
  color: #212529;
  font-size: 14px;
  margin-bottom: 8px;
}

:deep(.n-input) {
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

:deep(.n-input:hover) {
  background: rgba(255, 255, 255, 0.8);
}

:deep(.n-input.n-input--focus) {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 20px rgba(255, 154, 86, 0.3);
}

:deep(.n-input__prefix) {
  color: #6c757d;
  margin-right: 8px;
}

/* 登录按钮 */
.login-btn {
  background: linear-gradient(135deg, #ff9a56, #ff6a88) !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  height: 48px !important;
  font-size: 16px !important;
  box-shadow: 0 8px 25px rgba(255, 154, 86, 0.35) !important;
  transition: all 0.3s ease !important;
  letter-spacing: 0.5px !important;
  position: relative !important;
  overflow: hidden !important;
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.login-btn:hover::before {
  left: 100%;
}

:deep(.login-btn:hover:not(:disabled)) {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(255, 154, 86, 0.45) !important;
}

:deep(.login-btn:active:not(:disabled)) {
  transform: translateY(0);
}

:deep(.login-btn:disabled) {
  opacity: 0.6;
}

/* 底部信息 */
.login-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

.footer-text {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .admin-login-page {
    padding: 16px;
  }

  .login-card {
    padding: 32px 24px;
  }

  .login-title {
    font-size: 24px;
  }

  .logo-icon {
    width: 48px;
    height: 48px;
  }

  .login-header {
    margin-bottom: 32px;
  }

  .decoration-circle-1 {
    width: 300px;
    height: 300px;
    top: -150px;
    left: -150px;
  }

  .decoration-circle-2 {
    width: 200px;
    height: 200px;
    bottom: -100px;
    right: -100px;
  }

  .decoration-circle-3 {
    display: none;
  }
}
</style>
