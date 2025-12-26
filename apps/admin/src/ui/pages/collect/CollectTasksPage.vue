<template>
  <n-space vertical size="large">
    <n-card title="采集任务管理">
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" :loading="loading" @click="load">刷新</n-button>
          <n-select
            v-model:value="filterRunId"
            :options="runOptions"
            style="width: 200px"
            placeholder="选择采集运行"
            clearable
          />
          <n-select
            v-model:value="filterStatus"
            :options="statusOptions"
            style="width: 150px"
            placeholder="选择状态"
            clearable
          />
        </n-space>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
      />
    </n-card>

    <!-- 任务详情弹窗 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="采集任务详情"
      style="max-width: 800px; width: 100%"
    >
      <n-space vertical size="large" v-if="selectedTask">
        <n-descriptions :columns="2" bordered>
          <n-descriptions-item label="任务ID">{{ selectedTask.id }}</n-descriptions-item>
          <n-descriptions-item label="采集源">{{ selectedTask.source_name }}</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="getStatusType(selectedTask.status)">{{
              getStatusLabel(selectedTask.status)
            }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="进度"
            >{{ selectedTask.current_page }} / {{ selectedTask.total_pages }}</n-descriptions-item
          >
          <n-descriptions-item label="新增数量">
            <n-statistic :value="selectedTask.created_count" />
          </n-descriptions-item>
          <n-descriptions-item label="更新数量">
            <n-statistic :value="selectedTask.updated_count" />
          </n-descriptions-item>
          <n-descriptions-item label="错误数量">
            <n-statistic :value="selectedTask.error_count" />
          </n-descriptions-item>
          <n-descriptions-item label="总计">
            <n-statistic :value="selectedTask.created_count + selectedTask.updated_count" />
          </n-descriptions-item>
          <n-descriptions-item label="开始时间" v-if="selectedTask.started_at">
            {{ formatTime(selectedTask.started_at) }}
          </n-descriptions-item>
          <n-descriptions-item label="完成时间" v-if="selectedTask.finished_at">
            {{ formatTime(selectedTask.finished_at) }}
          </n-descriptions-item>
        </n-descriptions>
        <n-alert v-if="selectedTask.error_message" type="error" :bordered="false">
          {{ selectedTask.error_message }}
        </n-alert>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { NButton, NTag, useMessage } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { http } from '../../../lib/http';

type CollectTask = {
  id: number;
  run_id: number;
  source_id: number;
  source_name: string;
  status: number;
  current_page: number;
  total_pages: number;
  created_count: number;
  updated_count: number;
  error_count: number;
  error_message: string;
  started_at: number;
  finished_at: number;
  created_at: number;
  updated_at: number;
};

type CollectRun = {
  id: number;
  job_name: string;
};

const msg = useMessage();
const loading = ref(false);
const items = ref<CollectTask[]>([]);
const runs = ref<CollectRun[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filterRunId = ref<number | null>(null);
const filterStatus = ref<number | null>(null);
const showDetailModal = ref(false);
const selectedTask = ref<CollectTask | null>(null);

const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已完成', value: 2 },
  { label: '已失败', value: 3 },
];

const runOptions = computed<SelectOption[]>(() => {
  return runs.value.map((r) => ({
    label: `${r.id} - ${r.job_name}`,
    value: r.id,
  }));
});

function getStatusLabel(status: number): string {
  const labels: Record<number, string> = { 0: '待处理', 1: '进行中', 2: '已完成', 3: '已失败' };
  return labels[status] || '未知';
}

function getStatusType(status: number): 'default' | 'success' | 'warning' | 'error' {
  const types: Record<number, 'default' | 'success' | 'warning' | 'error'> = {
    0: 'default',
    1: 'warning',
    2: 'success',
    3: 'error',
  };
  return types[status] || 'default';
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString();
}

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/collect/tasks', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        runId: filterRunId.value,
        status: filterStatus.value,
      },
    });
    items.value = (res.data?.items || []) as CollectTask[];
    total.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function loadRuns() {
  try {
    const res = await http.get('/admin/collect/runs', { params: { pageSize: 1000 } });
    runs.value = (res.data?.items || []) as CollectRun[];
  } catch (e) {
    console.error('Failed to load runs', e);
  }
}

function handlePageChange(newPage: number) {
  page.value = newPage;
  load();
}

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  pageCount: Math.ceil(total.value / pageSize.value),
  itemCount: total.value,
  prefix: (info: any) => `共 ${info.itemCount} 条`,
  onChange: handlePageChange,
}));

const columns: DataTableColumns<CollectTask> = [
  { title: '任务ID', key: 'id', width: 100 },
  { title: '采集源', key: 'source_name', minWidth: 150 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NTag, { type: getStatusType(row.status) }, { default: () => getStatusLabel(row.status) }),
  },
  {
    title: '进度',
    key: 'current_page',
    width: 100,
    render: (row) => `${row.current_page} / ${row.total_pages}`,
  },
  { title: '新增', key: 'created_count', width: 80, align: 'center' },
  { title: '更新', key: 'updated_count', width: 80, align: 'center' },
  { title: '错误', key: 'error_count', width: 80, align: 'center' },
  {
    title: '总计',
    key: 'total',
    width: 80,
    align: 'center',
    render: (row) => row.created_count + row.updated_count,
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          tertiary: true,
          type: 'info',
          onClick: () => {
            selectedTask.value = row;
            showDetailModal.value = true;
          },
        },
        { default: () => '详情' }
      ),
  },
];

onMounted(() => {
  loadRuns();
  load();
});
</script>
