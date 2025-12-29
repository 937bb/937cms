<template>
  <n-space vertical size="large">
    <n-card title="采集任务（当前站点）">
      <n-alert type="info" title="说明" style="margin-bottom: 12px">
        采集任务不需要选择站点：执行时会自动指向当前 CMS（domain_url/api_pass 由系统注入）。
      </n-alert>

      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" @click="openCreate">新增任务</n-button>
          <n-button secondary :loading="loading" @click="load">刷新</n-button>
        </n-space>
      </n-space>

      <n-data-table :columns="columns" :data="items" :bordered="false" :loading="loading" />
    </n-card>

    <n-modal
      v-model:show="showModal"
      preset="card"
      title="采集任务"
      style="max-width: 860px; width: 100%"
    >
      <n-form :model="form" label-placement="left" label-width="170" style="max-width: 760px">
        <n-form-item label="任务名称">
          <n-input v-model:value="form.name" placeholder="例如：全量采集（五个资源站）" />
        </n-form-item>
        <n-form-item label="采集时间范围（小时）">
          <n-select
            v-model:value="form.collect_time"
            :options="collectTimeOptions"
            style="max-width: 320px"
          />
        </n-form-item>
        <n-form-item label="分页请求间隔（秒）">
          <n-input-number v-model:value="form.interval_seconds" :min="0" :max="3600" />
        </n-form-item>
        <n-form-item label="采集并发">
          <n-input-number v-model:value="form.max_workers" :min="1" :max="64" />
        </n-form-item>
        <n-form-item label="推送并发">
          <n-input-number v-model:value="form.push_workers" :min="1" :max="32" />
        </n-form-item>
        <n-form-item label="推送间隔（秒）">
          <n-input-number v-model:value="form.push_interval_seconds" :min="0" :max="3600" />
        </n-form-item>
        <n-form-item label="定时执行">
          <CronScheduler v-model="form.cron" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="form.status" />
        </n-form-item>
        <n-form-item label="选择采集源">
          <n-select
            v-model:value="form.source_ids"
            multiple
            :options="sourceOptions"
            placeholder="至少选择一个采集源"
          />
        </n-form-item>
      </n-form>

      <n-space justify="end">
        <n-button secondary @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';
import CronScheduler from '../../components/CronScheduler.vue';

type JobItem = {
  id: number;
  name: string;
  collect_time: number;
  interval_seconds: number;
  push_workers: number;
  push_interval_seconds: number;
  max_workers: number;
  cron: string;
  status: number;
  source_ids: number[];
  updated_at: number;
};

type SourceItem = { id: number; name: string };

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const items = ref<JobItem[]>([]);
const sources = ref<SourceItem[]>([]);
const runningIds = ref(new Set<number>());

const form = reactive<any>({
  id: 0,
  name: '',
  collect_time: 0,
  interval_seconds: 1,
  push_workers: 1,
  push_interval_seconds: 2,
  max_workers: 2,
  cron: '',
  status: true,
  source_ids: [] as number[],
});

const collectTimeOptions = [
  { label: '0（全部）', value: 0 },
  { label: '1（最近 1 小时）', value: 1 },
  { label: '24（最近 24 小时）', value: 24 },
  { label: '168（最近 7 天）', value: 168 },
];

const sourceOptions = computed(() =>
  sources.value.map((s) => ({ label: `${s.id} - ${s.name}`, value: s.id }))
);

function openCreate() {
  Object.assign(form, {
    id: 0,
    name: '',
    collect_time: 0,
    interval_seconds: 1,
    push_workers: 1,
    push_interval_seconds: 2,
    max_workers: 2,
    cron: '',
    status: true,
    source_ids: [],
  });
  showModal.value = true;
}

function openEdit(row: JobItem) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    collect_time: Number(row.collect_time || 0),
    interval_seconds: Number(row.interval_seconds || 0),
    push_workers: Number(row.push_workers || 1),
    push_interval_seconds: Number(row.push_interval_seconds || 0),
    max_workers: Number(row.max_workers || 1),
    cron: String(row.cron || ''),
    status: Number(row.status) === 1,
    source_ids: Array.isArray(row.source_ids) ? row.source_ids.slice() : [],
  });
  showModal.value = true;
}

async function load() {
  loading.value = true;
  try {
    const [srcRes, jobRes] = await Promise.all([
      http.get('/admin/collect/sources'),
      http.get('/admin/collect/jobs'),
    ]);
    sources.value = (srcRes.data?.items || []) as SourceItem[];
    items.value = (jobRes.data?.items || []) as JobItem[];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!String(form.name || '').trim()) {
    msg.warning('请输入任务名称');
    return;
  }
  if (!Array.isArray(form.source_ids) || form.source_ids.length < 1) {
    msg.warning('至少选择一个采集源');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...form,
      status: form.status ? 1 : 0,
      collect_time: Number(form.collect_time || 0),
      interval_seconds: Number(form.interval_seconds || 0),
      push_workers: Number(form.push_workers || 1),
      push_interval_seconds: Number(form.push_interval_seconds || 0),
      max_workers: Number(form.max_workers || 1),
      source_ids: form.source_ids
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isFinite(n)),
    };
    if (!payload.id) await http.post('/admin/collect/jobs/create', payload);
    else await http.post('/admin/collect/jobs/save', payload);
    msg.success('保存成功');
    showModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  try {
    await http.post('/admin/collect/jobs/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

async function runOnce(id: number) {
  if (runningIds.value.has(id)) return;
  runningIds.value.add(id);
  try {
    await http.post('/admin/collect/jobs/run', { id });
    msg.success('已加入队列');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '执行失败'));
  } finally {
    runningIds.value.delete(id);
  }
}

function renderSources(row: JobItem) {
  const ids = Array.isArray(row.source_ids) ? row.source_ids : [];
  if (!ids.length) return h('span', {}, '-');
  return h(
    'div',
    { style: 'display:flex; flex-wrap:wrap; gap:6px;' },
    ids.map((id) => h(NTag, { size: 'small' }, { default: () => String(id) }))
  );
}

const columns: DataTableColumns<JobItem> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '任务名', key: 'name', minWidth: 220 },
  { title: '范围(h)', key: 'collect_time', width: 90 },
  { title: '间隔(s)', key: 'interval_seconds', width: 90 },
  { title: '采集并发', key: 'max_workers', width: 100 },
  { title: '推送并发', key: 'push_workers', width: 100 },
  { title: '推送间隔', key: 'push_interval_seconds', width: 100 },
  { title: '定时', key: 'cron', width: 140 },
  {
    title: '采集源',
    key: 'source_ids',
    minWidth: 180,
    render: (row) => renderSources(row),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => (Number(row.status) ? '启用' : '禁用'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' }, [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            tertiary: true,
            loading: runningIds.value.has(row.id),
            disabled: runningIds.value.has(row.id),
            onClick: () => runOnce(row.id),
          },
          { default: () => '立即执行' }
        ),
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row) },
          { default: () => '编辑' }
        ),
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
            default: () => '确认删除该任务？',
          }
        ),
      ]),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
