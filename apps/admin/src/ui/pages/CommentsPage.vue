<template>
  <n-space vertical size="large">
    <n-card title="评论管理">
      <template #header-extra>
        <n-space>
          <n-select
            v-model:value="statusFilter"
            :options="statusOptions"
            placeholder="状态"
            clearable
            style="width: 100px"
            @update:value="search"
          />
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :row-key="(r: any) => r.id"
        @update:checked-row-keys="onCheck"
      />

      <n-space justify="space-between" style="margin-top: 16px">
        <n-space>
          <n-button :disabled="!checkedIds.length" @click="batchStatus(1)">批量通过</n-button>
          <n-button :disabled="!checkedIds.length" @click="batchStatus(0)">批量禁用</n-button>
          <n-button :disabled="!checkedIds.length" type="error" @click="batchDel"
            >批量删除</n-button
          >
        </n-space>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          @update:page="load"
        />
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { NButton, NSpace, NTag, useMessage, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { http } from '../../lib/http';

const msg = useMessage();
const dialog = useDialog();

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const statusFilter = ref<number | null>(null);
const checkedIds = ref<number[]>([]);

const statusOptions = [
  { label: '已通过', value: 1 },
  { label: '待审核', value: 0 },
];

const columns: DataTableColumns<any> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '视频ID', key: 'rid', width: 80 },
  {
    title: '用户',
    key: 'nickname',
    width: 100,
    render: (row) => row.nickname || row.username || row.name || '匿名',
  },
  { title: '内容', key: 'content', ellipsis: { tooltip: true } },
  { title: '顶', key: 'digg_up', width: 60 },
  { title: '踩', key: 'digg_down', width: 60 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) =>
      h(NTag, { type: row.status ? 'success' : 'warning', size: 'small' }, () =>
        row.status ? '已通过' : '待审核'
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: row.status ? 'warning' : 'success',
            onClick: () => toggleStatus(row),
          },
          () => (row.status ? '禁用' : '通过')
        ),
        h(NButton, { size: 'small', type: 'error', onClick: () => del(row.id) }, () => '删除'),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/comments', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        status: statusFilter.value ?? undefined,
      },
    });
    list.value = res.data.list;
    total.value = res.data.total;
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  load();
}

function onCheck(keys: number[]) {
  checkedIds.value = keys;
}

async function toggleStatus(row: any) {
  await http.post('/admin/comments/status', { id: row.id, status: row.status ? 0 : 1 });
  msg.success('更新成功');
  load();
}

async function del(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/comments/delete', { id });
      msg.success('删除成功');
      load();
    },
  });
}

async function batchDel() {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除选中的 ${checkedIds.value.length} 条评论吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/comments/batch-delete', { ids: checkedIds.value });
      msg.success('删除成功');
      checkedIds.value = [];
      load();
    },
  });
}

async function batchStatus(status: number) {
  await http.post('/admin/comments/batch-status', { ids: checkedIds.value, status });
  msg.success('更新成功');
  checkedIds.value = [];
  load();
}

onMounted(() => load());
</script>
