<template>
  <n-space vertical size="large">
    <n-card title="接口配置（站外入库）">
      <n-form :model="model" label-placement="left" label-width="140" style="max-width: 720px">
        <n-form-item label="站外入库密码">
          <n-input v-model:value="model.interfacePass" placeholder="用于站外入库" />
          <template #feedback>
            该密码用于资源站推送到本系统（站外入库）。建议至少 16 位随机字符串。
          </template>
        </n-form-item>
        <n-form-item label="TMDB API Key">
          <n-input v-model:value="model.tmdbApiKey" placeholder="用于海报搜索功能" />
          <template #feedback>
            用于海报搜索功能。前往
            <n-a href="https://www.themoviedb.org/settings/api" target="_blank">TMDB</n-a>
            免费注册获取 API Key。
          </template>
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
  interfacePass: '',
  tmdbApiKey: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings');
    model.interfacePass = String(res.data?.interfacePass || '');
    model.tmdbApiKey = String(res.data?.tmdbApiKey || '');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/save', model);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  load().catch(() => void 0);
});
</script>
