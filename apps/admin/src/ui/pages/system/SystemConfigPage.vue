<template>
  <n-space vertical size="large">
    <n-card title="网站配置">
      <n-form :model="model" label-placement="left" label-width="140" style="max-width: 720px">
        <n-form-item label="站点名称">
          <n-input v-model:value="model.siteName" placeholder="我的站点" />
        </n-form-item>
        <n-form-item label="站点域名">
          <n-input v-model:value="model.siteUrl" placeholder="https://example.com" />
        </n-form-item>
        <n-form-item label="LOGO(浅色)">
          <UploadInput v-model="model.siteLogo" dir="logo" />
        </n-form-item>
        <n-form-item label="LOGO(深色)">
          <UploadInput v-model="model.siteLogoDark" dir="logo" />
        </n-form-item>
        <n-form-item label="Favicon">
          <UploadInput v-model="model.siteFavicon" dir="icon" accept="image/*,.ico" />
        </n-form-item>
        <n-form-item label="搜索占位词">
          <n-input
            v-model:value="model.searchPlaceholder"
            placeholder="搜索电影、电视剧、综艺、动漫"
          />
        </n-form-item>
        <n-form-item label="热门搜索词">
          <n-input
            v-model:value="model.searchHot"
            type="textarea"
            :rows="2"
            placeholder="庆余年,误杀,..."
          />
          <template #feedback>多个关键词用英文逗号分隔</template>
        </n-form-item>
        <n-form-item label="站点关键词">
          <n-input v-model:value="model.siteKeywords" type="textarea" :rows="2" />
        </n-form-item>
        <n-form-item label="站点描述">
          <n-input v-model:value="model.siteDescription" type="textarea" :rows="2" />
        </n-form-item>
        <n-form-item label="备案号">
          <n-input v-model:value="model.siteIcp" />
        </n-form-item>
        <n-form-item label="版权信息">
          <n-input v-model:value="model.siteCopyright" />
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
import UploadInput from '../../components/UploadInput.vue';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);

const model = reactive({
  siteName: '',
  siteUrl: '',
  siteLogo: '',
  siteLogoDark: '',
  siteFavicon: '',
  siteKeywords: '',
  siteDescription: '',
  siteIcp: '',
  siteCopyright: '',
  searchHot: '',
  searchPlaceholder: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/site');
    Object.assign(model, res.data || {});
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/site', model);
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
