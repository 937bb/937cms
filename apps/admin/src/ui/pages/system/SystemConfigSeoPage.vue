<template>
  <n-space vertical size="large">
    <n-card title="SEO 配置">
      <n-form :model="model" label-placement="left" label-width="160" style="max-width: 980px">
        <n-divider title-placement="left">首页</n-divider>
        <n-form-item label="首页标题">
          <n-input v-model:value="model.homeTitle" placeholder="留空使用站点名称" />
        </n-form-item>
        <n-form-item label="首页关键词">
          <n-input
            v-model:value="model.homeKeywords"
            type="textarea"
            :rows="2"
            placeholder="多个关键词用英文逗号分隔"
          />
        </n-form-item>
        <n-form-item label="首页描述">
          <n-input v-model:value="model.homeDescription" type="textarea" :rows="2" />
        </n-form-item>

        <n-divider title-placement="left">详情/播放模板</n-divider>
        <n-form-item label="详情页 Title 模板">
          <n-input v-model:value="model.vodTitleTpl" placeholder="{vod_name} - {site_name}" />
          <template #feedback
            >支持占位：{site_name} {vod_name} {type_name} {vod_year} {vod_area} {vod_lang}
            {vod_actor} {vod_director}</template
          >
        </n-form-item>
        <n-form-item label="详情页 Keywords 模板">
          <n-input
            v-model:value="model.vodKeywordsTpl"
            placeholder="{vod_name},{type_name},{site_name}"
          />
          <template #feedback
            >支持占位：{site_name} {vod_name} {type_name} {vod_year} {vod_area} {vod_lang}
            {vod_actor} {vod_director}</template
          >
        </n-form-item>
        <n-form-item label="详情页 Description 模板">
          <n-input
            v-model:value="model.vodDescriptionTpl"
            type="textarea"
            :rows="2"
            placeholder="{vod_name} - {vod_content}"
          />
          <template #feedback
            >支持占位：{vod_name} {vod_remarks} {vod_blurb} {vod_content} {vod_actor} {vod_director}
            {vod_year} {vod_area} {vod_lang}</template
          >
        </n-form-item>
        <n-form-item label="播放页 Title 模板">
          <n-input
            v-model:value="model.playTitleTpl"
            placeholder="{vod_name} 第{episode}集 - 在线观看"
          />
          <template #feedback
            >支持占位：{site_name} {vod_name} {episode} {vod_year} {vod_area} {vod_lang} {vod_actor}
            {vod_director}</template
          >
        </n-form-item>
        <n-form-item label="播放页 Keywords 模板">
          <n-input
            v-model:value="model.playKeywordsTpl"
            placeholder="{vod_name},{episode},{vod_actor}"
          />
          <template #feedback
            >支持占位：{vod_name} {episode} {vod_actor} {vod_director} {vod_year} {vod_area}
            {vod_lang}</template
          >
        </n-form-item>
        <n-form-item label="播放页 Description 模板">
          <n-input
            v-model:value="model.playDescriptionTpl"
            type="textarea"
            :rows="2"
            placeholder="{vod_name} {episode} - {vod_content}"
          />
          <template #feedback
            >支持占位：{vod_name} {episode} {vod_remarks} {vod_blurb} {vod_content} {vod_actor}
            {vod_director} {vod_year} {vod_area} {vod_lang}</template
          >
        </n-form-item>

        <n-divider title-placement="left">列表/筛选页模板</n-divider>
        <n-form-item label="列表页 Title 模板">
          <n-input v-model:value="model.listTitleTpl" placeholder="{type_name} - {site_name}" />
          <template #feedback
            >支持占位：{site_name} {type_name} {area} {lang} {year} {keyword}</template
          >
        </n-form-item>
        <n-form-item label="列表页 Keywords 模板">
          <n-input
            v-model:value="model.listKeywordsTpl"
            placeholder="{type_name},{area},{lang},{year}"
          />
          <template #feedback
            >支持占位：{type_name} {area} {lang} {year} {keyword} {site_name}</template
          >
        </n-form-item>
        <n-form-item label="列表页 Description 模板">
          <n-input
            v-model:value="model.listDescriptionTpl"
            type="textarea"
            :rows="2"
            placeholder="{type_name}在线观看，共{total}部，第{page}页"
          />
          <template #feedback
            >支持占位：{type_name} {area} {lang} {year} {keyword} {total} {page}</template
          >
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
  homeTitle: '',
  homeKeywords: '',
  homeDescription: '',
  vodTitleTpl: '{vod_name} - {site_name}',
  vodKeywordsTpl: '{vod_name},{type_name},{site_name}',
  vodDescriptionTpl: '{vod_name} - {vod_remarks}',
  playTitleTpl: '{vod_name} - 在线观看',
  playKeywordsTpl: '{vod_name},{vod_actor}',
  playDescriptionTpl: '{vod_name} - {vod_remarks}',
  listTitleTpl: '{type_name} - {site_name}',
  listKeywordsTpl: '{type_name},{area},{lang},{year}',
  listDescriptionTpl: '{type_name}在线观看',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/seo');
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
    await http.post('/admin/system-settings/seo', model);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => load().catch(() => void 0));
</script>
