<script setup lang="ts">
import type { DataTableColumns, PaginationProps } from 'naive-ui';
import { NButton, NPopconfirm, NTag, NStatistic, NCheckbox, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type RunItem = {
  id: number;
  job_id: number;
  job_name: string;
  status: number;
  worker_id: string;
  progress_page: number;
  progress_total_pages: number;
  pushed_count: number;
  updated_count: number;
  created_count: number;
  error_count: number;
  message: string;
  started_at: number;
  finished_at: number;
  created_at: number;
  updated_at: number;
};

type JobItem = { id: number; name: string };

const msg = useMessage();
const loading = ref(false);
const items = ref<RunItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const jobs = ref<JobItem[]>([]);

const filters = reactive<{ status: number | null; jobId: number | null }>({
  status: null,
  jobId: null,
});

const statusOptions = [
  { label: '待执行', value: 0 },
  { label: '执行中', value: 1 },
  { label: '完成', value: 2 },
  { label: '失败', value: 3 },
];

const jobOptions = computed(() =>
  jobs.value.map((j) => ({ label: `${j.id} - ${j.name}`, value: j.id }))
);

function statusTag(status: number) {
  if (status === 0) return h(NTag, { type: 'default', size: 'small' }, { default: () => '待执行' });
  if (status === 1) return h(NTag, { type: 'warning', size: 'small' }, { default: () => '执行中' });
  if (status === 2) return h(NTag, { type: 'success', size: 'small' }, { default: () => '完成' });
  return h(NTag, { type: 'error', size: 'small' }, { default: () => '失败' });
}

function statusLabel(status?: number) {
  if (status === 0) return '待执行';
  if (status === 1) return '执行中';
  if (status === 2) return '完成';
  return '失败';
}

function formatTime(timestamp?: number) {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

async function loadJobs() {
  try {
    const res = await http.get('/admin/collect/jobs');
    jobs.value = (res.data?.items || []) as JobItem[];
  } catch {
    jobs.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/collect/runs', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        status: filters.status ?? undefined,
        job_id: filters.jobId ?? undefined,
      },
    });
    items.value = (res.data?.items || []) as RunItem[];
    total.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function cancelRun(id: number) {
  try {
    await http.post('/admin/collect/runs/cancel', { id });
    msg.success('已取消');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '取消失败'));
  }
}

async function deleteRun(id: number) {
  try {
    await http.post('/admin/collect/runs/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

const pagination = computed<PaginationProps>(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onUpdatePage: (p: number) => {
    page.value = p;
    load().catch(() => void 0);
  },
  onUpdatePageSize: (s: number) => {
    pageSize.value = s;
    page.value = 1;
    load().catch(() => void 0);
  },
}));

const showDetail = ref(false);
const detail = ref<RunItem | null>(null);
const taskDetails = ref<any[]>([]);
const loadingDetail = ref(false);

const showResumeModal = ref(false);
const selectedResumeSource = ref<number | null>(null);
const resumingRunId = ref<number | null>(null);

async function openDetail(row: RunItem) {
  detail.value = row;
  loadingDetail.value = true;
  try {
    const res = await http.get(`/admin/collect/tasks`, {
      params: { runId: row.id, pageSize: 1000 },
    });
    taskDetails.value = (res.data?.items || []) as any[];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载任务详情失败'));
    taskDetails.value = [];
  } finally {
    loadingDetail.value = false;
  }
  showDetail.value = true;
}

function getSourceStats(sourceId: number) {
  const tasks = taskDetails.value.filter((t) => t.source_id === sourceId);
  if (!tasks.length) return { pushed: 0, created: 0, updated: 0, error: 0 };
  const task = tasks[0];
  return {
    pushed: (task.created_count || 0) + (task.updated_count || 0),
    created: task.created_count || 0,
    updated: task.updated_count || 0,
    error: task.error_count || 0,
  };
}

function openResumeModal(sourceId: number, runId: number) {
  selectedResumeSource.value = sourceId;
  resumingRunId.value = runId;
  showResumeModal.value = true;
}

async function executeResume() {
  if (!resumingRunId.value || !selectedResumeSource.value) return;
  try {
    await http.post('/admin/collect/jobs/run', {
      id: detail.value?.job_id,
      source_ids: [selectedResumeSource.value],
    });
    msg.success('已加入队列');
    showResumeModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '执行失败'));
  }
}

const columns: DataTableColumns<RunItem> = [
  { title: 'Run ID', key: 'id', width: 90 },
  {
    title: '任务',
    key: 'job_name',
    minWidth: 200,
    render: (r) => `${r.job_id} - ${r.job_name || ''}`,
  },
  { title: '状态', key: 'status', width: 100, render: (r) => statusTag(Number(r.status)) },
  { title: '推送', key: 'pushed_count', width: 90 },
  { title: '更新', key: 'updated_count', width: 90 },
  { title: '新增', key: 'created_count', width: 90 },
  { title: '错误', key: 'error_count', width: 90 },
  { title: '开始时间', key: 'started_at', width: 180, render: (r) => formatTime(r.started_at) },
  { title: '结束时间', key: 'finished_at', width: 180, render: (r) => formatTime(r.finished_at) },
  {
    title: '消息',
    key: 'message',
    minWidth: 240,
    render: (row) =>
      h(
        NButton,
        {
          text: true,
          type: row.error_count > 0 ? 'error' : 'default',
          onClick: () => openDetail(row),
        },
        { default: () => (row.message ? String(row.message).slice(0, 80) : '-') }
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) => {
      const btns = [];
      // 只有待执行(0)或执行中(1)的任务可以取消
      if (row.status === 0 || row.status === 1) {
        btns.push(
          h(
            NPopconfirm,
            { onPositiveClick: () => cancelRun(row.id) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', tertiary: true, type: 'warning' },
                  { default: () => '取消' }
                ),
              default: () => '确认取消该任务？',
            }
          )
        );
      }
      btns.push(
        h(
          NPopconfirm,
          { onPositiveClick: () => deleteRun(row.id) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除该记录？',
          }
        )
      );
      return h('div', { style: 'display:flex; gap:8px;' }, btns);
    },
  },
];

onMounted(() => {
  loadJobs()
    .then(() => load())
    .catch(() => void 0);
});
</script>

<template>
  <n-space vertical size="large">
    <n-card title="采集记录（Runs）">
      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          style="width: 180px"
        />
        <n-select
          v-model:value="filters.jobId"
          :options="jobOptions"
          clearable
          placeholder="任务"
          style="min-width: 260px"
        />
        <n-button secondary :loading="loading" @click="load">查询</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
      />
    </n-card>

    <n-modal v-model:show="showDetail" preset="card" style="width: min(1000px, 95vw)">
      <template #header>
        <div v-if="detail">采集任务 #{{ detail.id }} - {{ detail.job_name }}</div>
      </template>
      <n-space vertical size="large">
        <!-- 总体统计 -->
        <n-space
          justify="space-between"
          align="center"
          style="padding: 16px; background: #f5f5f5; border-radius: 4px"
        >
          <n-statistic label="状态" :value="statusLabel(detail?.status)" />
          <n-statistic
            label="总进度"
            :value="`${detail?.progress_page}/${detail?.progress_total_pages}`"
          />
          <n-statistic label="推送成功" :value="detail?.pushed_count" type="success" />
          <n-statistic label="更新数" :value="detail?.updated_count" />
          <n-statistic label="新增数" :value="detail?.created_count" />
          <n-statistic
            label="错误数"
            :value="detail?.error_count"
            :type="detail?.error_count ? 'error' : 'success'"
          />
        </n-space>

        <!-- 按采集源分组显示 -->
        <div v-if="taskDetails.length > 0">
          <div style="font-weight: 600; margin-bottom: 12px\">采集源详情</div>
          <n-space vertical style="width: 100%">
            <div
              v-for="task in taskDetails"
              :key="task.id"
              style="padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px"
            >
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 8px;
                "
              >
                <div style="font-weight: 600">
                  {{ task.source_name || `源 #${task.source_id}` }}
                </div>
                <div style="display: flex; gap: 8px; align-items: center">
                  <n-tag v-if="task.status === 0" type="default" size="small">待执行</n-tag>
                  <n-tag v-else-if="task.status === 1" type="warning" size="small">执行中</n-tag>
                  <n-tag v-else-if="task.status === 2" type="success" size="small">完成</n-tag>
                  <n-tag v-else type="error" size="small">失败</n-tag>
                  <n-button
                    v-if="task.status === 3 || task.status === 0"
                    size="small"
                    type="primary"
                    tertiary
                    @click="openResumeModal(task.source_id, detail?.id || 0)"
                    >断点续采</n-button
                  >
                </div>
              </div>
              <div
                style="
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 12px;
                  font-size: 12px;
                "
              >
                <div>
                  <span style="color: #999">进度:</span> {{ task.current_page }}/{{
                    task.total_pages
                  }}
                </div>
                <div>
                  <span style="color: #999">采集数:</span>
                  {{ (task.created_count || 0) + (task.updated_count || 0) }}
                </div>
                <div><span style="color: #999">新增:</span> {{ task.created_count }}</div>
                <div><span style="color: #999">更新:</span> {{ task.updated_count }}</div>
                <div><span style="color: #999">失败:</span> {{ task.error_count }}</div>
              </div>
              <div
                v-if="task.error_message"
                style="
                  margin-top: 8px;
                  padding: 8px;
                  background: #fff3cd;
                  border-radius: 2px;
                  font-size: 12px;
                  color: #856404;
                "
              >
                {{ task.error_message }}
              </div>
            </div>
          </n-space>
        </div>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="showResumeModal"
      preset="card"
      title="断点续采确认"
      style="max-width: 400px; width: 100%"
    >
      <div style="padding: 12px 0">
        <div style="margin-bottom: 16px">确认从源 #{{ selectedResumeSource }} 的断点继续采集？</div>
        <div style="font-size: 12px; color: #999; margin-bottom: 16px">
          系统将从该源上次中断的位置继续采集
        </div>
      </div>
      <n-space justify="end">
        <n-button secondary @click="showResumeModal = false">取消</n-button>
        <n-button type="primary" @click="executeResume">确认</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>
