<template>
  <n-space vertical size="large">
    <n-card title="统一采集配置（全局）">
      <n-form :model="model" label-placement="left" label-width="140" style="max-width: 980px">
        <n-divider title-placement="left">默认入库状态</n-divider>
        <n-form-item label="默认状态">
          <n-radio-group v-model:value="model.defaultVodStatus">
            <n-radio :value="1">上架（审核通过）</n-radio>
            <n-radio :value="0">下架（待审核）</n-radio>
          </n-radio-group>
        </n-form-item>

        <n-divider title-placement="left">同义词（替换）</n-divider>
        <n-form-item label="启用同义词">
          <n-switch v-model:value="model.enableSynonyms" />
        </n-form-item>

        <n-grid :cols="2" :x-gap="12" :y-gap="12">
          <n-gi>
            <n-form-item label="片名同义词">
              <n-input
                v-model:value="model.nameSynonymsText"
                type="textarea"
                :autosize="{ minRows: 5, maxRows: 10 }"
                placeholder="每行一条：旧词=新词"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="简介同义词">
              <n-input
                v-model:value="model.contentSynonymsText"
                type="textarea"
                :autosize="{ minRows: 5, maxRows: 10 }"
                placeholder="每行一条：旧词=新词"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="播放源同义词">
              <n-input
                v-model:value="model.playFromSynonymsText"
                type="textarea"
                :autosize="{ minRows: 5, maxRows: 10 }"
                placeholder="每行一条：旧词=新词"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="地区/语言同义词">
              <n-input
                v-model:value="model.areaSynonymsText"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 6 }"
                placeholder="地区：每行一条：旧词=新词"
              />
              <div style="height: 8px" />
              <n-input
                v-model:value="model.langSynonymsText"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 6 }"
                placeholder="语言：每行一条：旧词=新词"
              />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-divider title-placement="left">重复/更新/合并规则</n-divider>
        <n-form-item label="去重字段（匹配为同一影片）">
          <n-checkbox-group v-model:value="model.dedupFields">
            <n-space wrap>
              <n-checkbox v-for="o in dedupOptions" :key="o.value" :value="o.value">{{
                o.label
              }}</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="允许更新字段（命中重复时）">
          <n-checkbox-group v-model:value="model.updateFields">
            <n-space wrap>
              <n-checkbox v-for="o in updateOptions" :key="o.value" :value="o.value">{{
                o.label
              }}</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="播放地址更新模式">
          <n-select
            v-model:value="model.playUpdateMode"
            :options="playModeOptions"
            style="max-width: 320px"
          />
        </n-form-item>

        <n-divider title-placement="left">图片同步</n-divider>
        <n-form-item label="同步图片到本地">
          <n-switch v-model:value="model.syncImages" />
          <template #feedback>关闭则直接使用资源站图片地址（更省服务器资源）。</template>
        </n-form-item>
        <n-form-item v-if="model.syncImages" label="最大图片大小">
          <n-input-number v-model:value="model.syncImageMaxBytes" :min="10_000" :max="50_000_000" />
          <span style="margin-left: 8px; color: #999">字节</span>
        </n-form-item>

        <n-divider title-placement="left">随机数据</n-divider>
        <n-grid :cols="2" :x-gap="12" :y-gap="12">
          <n-gi>
            <n-form-item label="随机点击数">
              <n-switch v-model:value="model.randomHits" />
              <template #feedback>入库时随机填充点击数。</template>
            </n-form-item>
            <n-form-item v-if="model.randomHits" label="范围">
              <n-input-number v-model:value="model.randomHitsMin" :min="0" :max="1_000_000_000" />
              <div style="width: 8px" />
              <n-input-number v-model:value="model.randomHitsMax" :min="0" :max="1_000_000_000" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="随机顶/踩/评分">
              <n-switch v-model:value="model.randomUpDown" />
              <div style="width: 10px" />
              <n-switch v-model:value="model.randomScore" />
            </n-form-item>
            <n-form-item v-if="model.randomUpDown" label="顶/踩范围">
              <n-input-number v-model:value="model.randomUpMin" :min="0" :max="1_000_000_000" />
              <div style="width: 8px" />
              <n-input-number v-model:value="model.randomUpMax" :min="0" :max="1_000_000_000" />
              <div style="width: 12px" />
              <n-input-number v-model:value="model.randomDownMin" :min="0" :max="1_000_000_000" />
              <div style="width: 8px" />
              <n-input-number v-model:value="model.randomDownMax" :min="0" :max="1_000_000_000" />
            </n-form-item>
            <n-form-item v-if="model.randomScore" label="评分范围">
              <n-input-number v-model:value="model.randomScoreMin" :min="0" :max="10" />
              <div style="width: 8px" />
              <n-input-number v-model:value="model.randomScoreMax" :min="0" :max="10" />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-divider title-placement="left">过滤关键词</n-divider>
        <n-form-item label="过滤关键词">
          <n-input
            v-model:value="model.filterKeywords"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="每行一个关键词，或用逗号分隔&#10;例如：&#10;国产&#10;福利&#10;三级片"
          />
          <template #feedback>采集和入库时，片名或简介包含这些关键词的视频将被跳过。</template>
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

type DedupField = 'name' | 'type' | 'year' | 'area' | 'lang' | 'actor' | 'director';
type UpdateField =
  | 'pic'
  | 'content'
  | 'remarks'
  | 'year'
  | 'area'
  | 'lang'
  | 'actor'
  | 'director'
  | 'play';

const dedupOptions: Array<{ label: string; value: DedupField }> = [
  { label: '片名', value: 'name' },
  { label: '分类', value: 'type' },
  { label: '年份', value: 'year' },
  { label: '地区', value: 'area' },
  { label: '语言', value: 'lang' },
  { label: '演员', value: 'actor' },
  { label: '导演', value: 'director' },
];

const updateOptions: Array<{ label: string; value: UpdateField }> = [
  { label: '封面', value: 'pic' },
  { label: '简介', value: 'content' },
  { label: '备注', value: 'remarks' },
  { label: '年份', value: 'year' },
  { label: '地区', value: 'area' },
  { label: '语言', value: 'lang' },
  { label: '演员', value: 'actor' },
  { label: '导演', value: 'director' },
  { label: '播放地址', value: 'play' },
];

const playModeOptions = [
  { label: '合并（推荐）', value: 'merge' },
  { label: '覆盖（全量替换）', value: 'replace' },
];

const model = reactive<any>({
  filterKeywords: '',
  defaultVodStatus: 1,
  randomHits: false,
  randomHitsMin: 1,
  randomHitsMax: 1000,
  randomUpDown: false,
  randomUpMin: 1,
  randomUpMax: 1000,
  randomDownMin: 1,
  randomDownMax: 1000,
  randomScore: false,
  randomScoreMin: 6.0,
  randomScoreMax: 9.9,
  enableSynonyms: false,
  nameSynonymsText: '',
  contentSynonymsText: '',
  playFromSynonymsText: '',
  areaSynonymsText: '',
  langSynonymsText: '',
  dedupFields: ['name', 'type'] as DedupField[],
  updateFields: ['play', 'remarks', 'pic'] as UpdateField[],
  playUpdateMode: 'merge',
  syncImages: false,
  syncImageMaxBytes: 3_000_000,
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/collect/settings');
    Object.assign(model, res.data || {});
    if (!Array.isArray(model.dedupFields)) model.dedupFields = ['name', 'type'];
    if (!Array.isArray(model.updateFields)) model.updateFields = ['play', 'remarks', 'pic'];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/collect/settings/save', model);
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
