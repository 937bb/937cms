<template>
  <n-space vertical size="large">
    <n-card title="附件管理">
      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索文件名"
          style="width: 200px"
          clearable
        />
        <n-select
          v-model:value="filters.module"
          :options="moduleOptions"
          clearable
          placeholder="模块"
          style="width: 120px"
        />
        <n-button secondary :loading="loading" @click="load">查询</n-button>
      </n-space>

      <n-space style="margin-bottom: 12px">
        <n-popconfirm @positive-click="batchDelete">
          <template #trigger>
            <n-button type="error" :disabled="selectedIds.length === 0">批量删除</n-button>
          </template>
          确认删除选中的 {{ selectedIds.length }} 个附件？
        </n-popconfirm>
      </n-space>

      <n-data-table
        remote
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: AttachmentRow) => row.id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, PaginationProps } from 'naive-ui';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type AttachmentRow = {
  id: number;
  name: string;
  path: string;
  url: string;
  size: number;
  mime_type: string;
  ext: string;
  module: string;
  ref_id: number;
  status: number;
  created_at: number;
};

const msg = useMessage();
const loading = ref(false);

const items = ref<AttachmentRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const selectedIds = ref<number[]>([]);

const filters = reactive({ keyword: '', module: null as string | null });
const moduleOptions = [
  { label: '视频', value: 'vod' },
  { label: '资讯', value: 'article' },
  { label: '专题', value: 'topic' },
  { label: '其他', value: 'other' },
];

const pagination = computed<PaginationProps>(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onUpdatePage: (p: number) => {
    page.value = p;
    load();
  },
  onUpdatePageSize: (s: number) => {
    pageSize.value = s;
    page.value = 1;
    load();
  },
}));

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/attachments', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        module: filters.module || undefined,
      },
    });
    items.value = res.data?.items || [];
    total.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function remove(id: number) {
  try {
    await http.post('/admin/attachments/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

function handleCheck(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[];
}

async function batchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/attachments/batch-delete', { ids: selectedIds.value });
    msg.success('批量删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatTime(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString('zh-CN');
}

const columns: DataTableColumns<AttachmentRow> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 80 },
  { title: '文件名', key: 'name', minWidth: 200 },
  { title: '扩展名', key: 'ext', width: 80 },
  { title: '大小', key: 'size', width: 100, render: (r) => formatSize(r.size) },
  { title: '模块', key: 'module', width: 80 },
  { title: '上传时间', key: 'created_at', width: 180, render: (r) => formatTime(r.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.id) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除？',
          }
        ),
      ]),
  },
];

onMounted(() => {
  load();
});
</script>
