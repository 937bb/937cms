<template>
  <n-space vertical size="large">
    <n-card title="扩展分类配置">
      <n-alert type="info" style="margin-bottom: 16px">
        全局扩展分类配置，用于前台筛选功能。分类未单独配置时将使用此默认值。多个选项用英文逗号分隔。
      </n-alert>
      <n-form
        :model="extendModel"
        label-placement="left"
        label-width="140"
        style="max-width: 720px"
      >
        <n-form-item label="视频剧情/类型">
          <n-input
            v-model:value="extendModel.vodExtendClass"
            type="textarea"
            :rows="2"
            placeholder="动作,喜剧,爱情,科幻,恐怖,战争,犯罪,动画,奇幻,武侠,冒险,枪战,悬疑,惊悚,经典,青春,文艺,微电影,古装,历史,运动,农村,儿童,网络电影"
          />
        </n-form-item>
        <n-form-item label="视频地区">
          <n-input
            v-model:value="extendModel.vodExtendArea"
            type="textarea"
            :rows="2"
            placeholder="大陆,香港,台湾,美国,韩国,日本,泰国,印度,英国,法国,德国,西班牙,加拿大,澳大利亚,其他"
          />
        </n-form-item>
        <n-form-item label="视频语言">
          <n-input
            v-model:value="extendModel.vodExtendLang"
            type="textarea"
            :rows="2"
            placeholder="国语,粤语,英语,韩语,日语,法语,德语,泰语,其他"
          />
        </n-form-item>
        <n-form-item label="视频年份">
          <n-input
            v-model:value="extendModel.vodExtendYear"
            type="textarea"
            :rows="2"
            placeholder="2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004"
          />
        </n-form-item>
        <n-form-item label="视频版本">
          <n-input
            v-model:value="extendModel.vodExtendVersion"
            placeholder="高清版,剧场版,抢先版,OVA,TV"
          />
        </n-form-item>
        <n-form-item label="视频状态">
          <n-input v-model:value="extendModel.vodExtendState" placeholder="正片,预告片,花絮" />
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

const extendModel = reactive({
  vodExtendClass: '',
  vodExtendArea: '',
  vodExtendLang: '',
  vodExtendYear: '',
  vodExtendVersion: '',
  vodExtendState: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/extend');
    extendModel.vodExtendClass = res.data?.vodExtendClass || '';
    extendModel.vodExtendArea = res.data?.vodExtendArea || '';
    extendModel.vodExtendLang = res.data?.vodExtendLang || '';
    extendModel.vodExtendYear = res.data?.vodExtendYear || '';
    extendModel.vodExtendVersion = res.data?.vodExtendVersion || '';
    extendModel.vodExtendState = res.data?.vodExtendState || '';
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载扩展配置失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/extend', extendModel);
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
