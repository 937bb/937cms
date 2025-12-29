<template>
  <n-space vertical size="large">
    <n-card title="上传配置">
      <n-form :model="model" label-placement="left" label-width="160" style="max-width: 760px">
        <n-form-item label="最大上传大小(MB)">
          <n-input-number v-model:value="model.maxMb" :min="1" :max="20" />
          <template #feedback>当前上传使用内存缓冲，建议不要设置过大（最大 20MB）</template>
        </n-form-item>

        <n-form-item label="允许 SVG">
          <n-switch v-model:value="model.allowSvg" />
          <template #feedback>SVG 可能存在安全风险，请仅上传可信文件</template>
        </n-form-item>

        <n-form-item label="允许任意文件上传">
          <n-switch v-model:value="model.allowAny" />
          <template #feedback>开启后可通过上传接口上传非图片文件（高风险）</template>
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
  maxMb: 10,
  allowSvg: false,
  allowAny: false,
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/upload');
    const data = res.data || {};
    model.maxMb = Number(data.maxMb || 10);
    model.allowSvg = Number(data.allowSvg || 0) === 1;
    model.allowAny = Number(data.allowAny || 0) === 1;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/upload', {
      maxMb: Number(model.maxMb || 10),
      allowSvg: model.allowSvg ? 1 : 0,
      allowAny: model.allowAny ? 1 : 0,
    });
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
