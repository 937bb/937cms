<template>
  <n-space vertical size="large">
    <n-card title="搜索采集">
      <n-alert type="info" :bordered="false" style="margin-bottom: 16px">
        通过视频名称搜索所有启用的采集源，找到后可直接入库。支持跨源搜索，一次搜索所有采集源。
      </n-alert>

      <n-space align="center" style="margin-bottom: 16px">
        <n-input
          v-model:value="keyword"
          placeholder="输入视频名称搜索"
          style="width: 300px"
          clearable
          @keyup.enter="search"
        />
        <n-select
          v-model:value="selectedSourceIds"
          :options="sourceOptions"
          multiple
          placeholder="选择采集源（留空搜索全部）"
          style="width: 400px"
          clearable
        />
        <n-button type="primary" :loading="searching" @click="search">搜索</n-button>
        <n-button secondary :loading="loadingSources" @click="loadSources">刷新采集源</n-button>
      </n-space>

      <!-- 搜索结果 -->
      <template v-if="searchResults.length">
        <n-space justify="space-between" align="center" style="margin-bottom: 12px">
          <span>共搜索到 {{ totalCount }} 条结果（来自 {{ searchResults.length }} 个采集源）</span>
          <n-space>
            <n-button
              type="info"
              :disabled="!selectedItems.length"
              :loading="collecting"
              @click="collectSelected"
            >
              采集选中 ({{ selectedItems.length }})
            </n-button>
          </n-space>
        </n-space>

        <n-collapse>
          <n-collapse-item
            v-for="result in searchResults"
            :key="result.source_id"
            :title="`${result.source_name} (${result.items.length} 条)`"
            :name="result.source_id"
          >
            <template v-if="result.error">
              <n-alert type="error" :bordered="false">{{ result.error }}</n-alert>
            </template>
            <template v-else-if="result.items.length">
              <n-data-table
                :columns="columns"
                :data="result.items"
                :bordered="false"
                :row-key="(row: SearchItem) => `${row.source_id}-${row.vod_id}`"
                v-model:checked-row-keys="checkedKeys"
                size="small"
                max-height="400"
              />
            </template>
            <template v-else>
              <n-empty description="未找到相关视频" />
            </template>
          </n-collapse-item>
        </n-collapse>
      </template>

      <template v-else-if="searched && !searching">
        <n-empty description="未找到相关视频，请尝试其他关键词" />
      </template>
    </n-card>

    <!-- 采集结果弹窗 -->
    <n-modal v-model:show="showResultModal" preset="card" style="max-width: 900px; width: 100%">
      <template #header> 采集结果统计 </template>
      <n-space vertical size="large">
        <n-space
          justify="space-between"
          align="center"
          style="padding: 16px; background: #f5f5f5; border-radius: 4px"
        >
          <n-statistic label="总数" :value="collectResults.length" />
          <n-statistic label="成功" :value="successCount" type="success" />
          <n-statistic label="失败" :value="failureCount" type="error" />
          <n-progress
            type="circle"
            :percentage="
              collectResults.length ? Math.round((successCount / collectResults.length) * 100) : 0
            "
            :stroke-width="8"
            :show-indicator="false"
            style="width: 80px"
          />
        </n-space>
        <n-data-table
          :columns="resultColumns"
          :data="collectResults"
          :bordered="false"
          size="small"
          max-height="400"
        />
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showResultModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NButton, NImage, NTag, NStatistic, NProgress, useMessage } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { http } from '../../../lib/http';

type SourceItem = {
  id: number;
  name: string;
  base_url: string;
  status: number;
};

type SearchItem = {
  source_id: number;
  source_name: string;
  vod_id: number;
  vod_name: string;
  vod_pic?: string;
  vod_remarks?: string;
  vod_year?: string;
  vod_area?: string;
  type_name?: string;
  vod_play_from?: string;
};

type SearchResult = {
  source_id: number;
  source_name: string;
  items: SearchItem[];
  error?: string;
};

type CollectResult = {
  source_id: number;
  vod_id: number;
  success: boolean;
  message: string;
};

const msg = useMessage();
const keyword = ref('');
const selectedSourceIds = ref<number[]>([]);
const sources = ref<SourceItem[]>([]);
const loadingSources = ref(false);
const searching = ref(false);
const searched = ref(false);
const searchResults = ref<SearchResult[]>([]);
const checkedKeys = ref<string[]>([]);
const collecting = ref(false);
const showResultModal = ref(false);
const collectResults = ref<CollectResult[]>([]);

const sourceOptions = computed(() =>
  sources.value.filter((s) => s.status === 1).map((s) => ({ label: s.name, value: s.id }))
);

const totalCount = computed(() => searchResults.value.reduce((sum, r) => sum + r.items.length, 0));

const successCount = computed(() => collectResults.value.filter((r) => r.success).length);

const failureCount = computed(() => collectResults.value.filter((r) => !r.success).length);

const selectedItems = computed(() => {
  const items: Array<{ source_id: number; vod_id: number }> = [];
  for (const key of checkedKeys.value) {
    const [sourceId, vodId] = key.split('-').map(Number);
    if (sourceId && vodId) {
      items.push({ source_id: sourceId, vod_id: vodId });
    }
  }
  return items;
});

async function loadSources() {
  loadingSources.value = true;
  try {
    const res = await http.get('/admin/collect/sources');
    sources.value = (res.data?.items || []) as SourceItem[];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载采集源失败'));
  } finally {
    loadingSources.value = false;
  }
}

async function search() {
  const kw = keyword.value.trim();
  if (!kw) {
    msg.warning('请输入搜索关键词');
    return;
  }
  searching.value = true;
  searched.value = true;
  checkedKeys.value = [];
  try {
    const params: any = { keyword: kw };
    if (selectedSourceIds.value.length) {
      params.source_ids = selectedSourceIds.value.join(',');
    }
    const res = await http.get('/admin/collect/search', { params });
    searchResults.value = (res.data?.results || []) as SearchResult[];
    msg.success(`搜索完成，共 ${totalCount.value} 条结果`);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '搜索失败'));
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
}

async function collectSingle(sourceId: number, vodId: number) {
  try {
    const res = await http.post('/admin/collect/search/collect', {
      source_id: sourceId,
      vod_id: vodId,
    });
    if (res.data?.ok) {
      msg.success(res.data.message || '采集成功');
    } else {
      msg.error(res.data?.message || '采集失败');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '采集失败'));
  }
}

async function collectSelected() {
  if (!selectedItems.value.length) {
    msg.warning('请先选择要采集的视频');
    return;
  }
  collecting.value = true;
  try {
    const res = await http.post('/admin/collect/search/collect-batch', {
      items: selectedItems.value,
    });
    collectResults.value = (res.data?.results || []) as CollectResult[];
    showResultModal.value = true;
    const successCount = collectResults.value.filter((r) => r.success).length;
    msg.success(
      `采集完成：成功 ${successCount}，失败 ${collectResults.value.length - successCount}`
    );
    checkedKeys.value = [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '批量采集失败'));
  } finally {
    collecting.value = false;
  }
}

const columns: DataTableColumns<SearchItem> = [
  { type: 'selection' },
  {
    title: '封面',
    key: 'vod_pic',
    width: 80,
    render: (row) =>
      row.vod_pic
        ? h(NImage, {
            src: row.vod_pic,
            width: 50,
            height: 70,
            objectFit: 'cover',
            lazy: true,
            fallbackSrc: '/placeholder.png',
          })
        : '-',
  },
  { title: '视频名称', key: 'vod_name', minWidth: 200 },
  { title: '分类', key: 'type_name', width: 100 },
  { title: '年份', key: 'vod_year', width: 80 },
  { title: '地区', key: 'vod_area', width: 80 },
  { title: '备注', key: 'vod_remarks', width: 120 },
  {
    title: '线路',
    key: 'vod_play_from',
    width: 150,
    render: (row) => {
      const lines = (row.vod_play_from || '').split('$$$').filter(Boolean);
      if (!lines.length) return '-';
      return h(
        'div',
        { style: 'display: flex; flex-wrap: wrap; gap: 4px;' },
        lines.map((line) => h(NTag, { size: 'small', type: 'info' }, { default: () => line }))
      );
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(
        NButton,
        { size: 'small', type: 'primary', onClick: () => collectSingle(row.source_id, row.vod_id) },
        { default: () => '采集' }
      ),
  },
];

const resultColumns: DataTableColumns<CollectResult> = [
  { title: '采集源ID', key: 'source_id', width: 100 },
  { title: '视频ID', key: 'vod_id', width: 100 },
  {
    title: '状态',
    key: 'success',
    width: 80,
    render: (row) =>
      h(
        NTag,
        { type: row.success ? 'success' : 'error', size: 'small' },
        { default: () => (row.success ? '成功' : '失败') }
      ),
  },
  { title: '消息', key: 'message' },
];

onMounted(() => {
  loadSources().catch(() => void 0);
});
</script>
