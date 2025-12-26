<template>
  <div class="session-token-config-page">
    <n-space vertical :size="16">
      <h2>会话 Token 配置</h2>

      <n-card title="功能开关">
        <n-space vertical :size="16">
          <n-switch v-model:value="config.enabled" />
          <n-text depth="3">启用会话 Token 分发机制，用于保护 Public API</n-text>
        </n-space>
      </n-card>

      <n-space>
        <n-button type="primary" :loading="saving" @click="handleSave"> 保存配置 </n-button>
        <n-button @click="handleReset"> 重置 </n-button>
      </n-space>

      <n-card title="说明">
        <n-space vertical :size="12">
          <div>
            <strong>工作原理：</strong>
            <p>
              Nuxt 服务端首次请求时，调用 /api/v1/auth/session-token 获取会话 Token，然后在所有
              Public API 请求中携带此 Token。后端验证 Token 的有效性。
            </p>
          </div>
          <div>
            <strong>Token 特性：</strong>
            <p>
              - Token 在服务端生成和验证，用户无法在浏览器 Network 中看到真实的 API Key<br />
              - Token 永不过期，只要页面不关闭就可以一直使用<br />
              - 关闭页面时 Token 自动清空，下次打开页面重新获取<br />
              - 每个会话独立，无法跨会话重用
            </p>
          </div>
          <div>
            <strong>关闭功能：</strong>
            <p>关闭此功能后，Public API 无限制访问（不推荐用于生产环境）</p>
          </div>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NCard, NSpace, NSwitch, NText, NButton, useMessage } from 'naive-ui';
import { http } from '../../../lib/http';

const message = useMessage();

const config = ref({
  enabled: 0,
});

const saving = ref(false);

const fetchConfig = async () => {
  try {
    const response = await http.get('/admin/session-token-config');
    const data = response.data?.data;
    config.value = {
      enabled: data?.enabled ? true : false,
    };
  } catch (error) {
    message.error('获取配置失败');
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    await http.post('/admin/session-token-config', {
      enabled: config.value.enabled ? 1 : 0,
    });
    message.success('配置保存成功');
    await fetchConfig();
  } catch (error) {
    message.error('保存配置失败');
  } finally {
    saving.value = false;
  }
};

const handleReset = async () => {
  await fetchConfig();
};

onMounted(() => {
  fetchConfig();
});
</script>

<style scoped>
.session-token-config-page {
  padding: 20px;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

p {
  margin: 4px 0;
  color: #666;
}
</style>
