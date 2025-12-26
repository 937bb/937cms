<template>
  <n-space vertical size="large">
    <n-card title="播放配置">
      <n-form :model="model" label-placement="left" label-width="160" style="max-width: 760px">
        <n-form-item label="试看时长(秒)">
          <n-input-number v-model:value="model.trysee" :min="0" :max="36000" />
          <template #feedback>0=不限制；后续会在播放接口/前台联动控制</template>
        </n-form-item>
        <n-form-item label="观看所需积分">
          <n-input-number v-model:value="model.points" :min="0" :max="1_000_000" />
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
  trysee: 0,
  points: 0,
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/play');
    const data = res.data || {};
    model.trysee = Number(data.trysee || 0);
    model.points = Number(data.points || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/play', {
      trysee: Number(model.trysee || 0),
      points: Number(model.points || 0),
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
