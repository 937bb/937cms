<template>
  <n-space vertical size="large">
    <n-card title="URL 配置（预留）">
      <n-alert type="info" title="说明" style="margin-bottom: 12px">
        当前项目是前后端分离（Nuxt），URL
        规则/伪静态通常由前端路由与反向代理决定；这里先保留配置位，后续补齐。
      </n-alert>
      <n-form :model="model" label-placement="left" label-width="160" style="max-width: 760px">
        <n-form-item label="启用 URL 配置">
          <n-switch v-model:value="model.enabled" />
        </n-form-item>
        <n-form-item label="启用美化 URL">
          <n-switch v-model:value="model.prettyUrls" />
        </n-form-item>
      </n-form>

      <n-space justify="end">
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);

const model = reactive({
  enabled: false,
  prettyUrls: false,
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/url');
    const data = res.data || {};
    model.enabled = Number(data.enabled || 0) === 1;
    model.prettyUrls = Number(data.prettyUrls || 0) === 1;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/url', {
      enabled: model.enabled ? 1 : 0,
      prettyUrls: model.prettyUrls ? 1 : 0,
    });
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => load().catch(() => void 0));
</script>
