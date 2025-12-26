<template>
  <n-space vertical size="large">
    <n-card title="留言板管理">
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

    <n-modal v-model:show="showReply" preset="card" title="回复留言" style="width: 500px">
      <n-form>
        <n-form-item label="留言内容">
          <n-input :value="replyTarget?.content" readonly type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="回复">
          <n-input
            v-model:value="replyContent"
            type="textarea"
            :rows="3"
            placeholder="输入回复内容"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showReply = false">取消</n-button>
          <n-button type="primary" :loading="replying" @click="submitReply">提交回复</n-button>
        </n-space>
      </template>
    </n-modal>
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
  {
    title: '用户',
    key: 'nickname',
    width: 100,
    render: (row) => row.nickname || row.username || row.name || '匿名',
  },
  { title: '内容', key: 'content', ellipsis: { tooltip: true } },
  { title: '回复', key: 'reply', ellipsis: { tooltip: true } },
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
    width: 180,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => openReply(row) }, () => '回复'),
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
    const res = await http.get('/admin/gbook', {
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

// 回复
const showReply = ref(false);
const replying = ref(false);
const replyTarget = ref<any>(null);
const replyContent = ref('');

function openReply(row: any) {
  replyTarget.value = row;
  replyContent.value = row.reply || '';
  showReply.value = true;
}

async function submitReply() {
  replying.value = true;
  try {
    await http.post('/admin/gbook/reply', { id: replyTarget.value.id, reply: replyContent.value });
    msg.success('回复成功');
    showReply.value = false;
    load();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '回复失败');
  } finally {
    replying.value = false;
  }
}

async function toggleStatus(row: any) {
  await http.post('/admin/gbook/status', { id: row.id, status: row.status ? 0 : 1 });
  msg.success('更新成功');
  load();
}

async function del(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条留言吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/gbook/delete', { id });
      msg.success('删除成功');
      load();
    },
  });
}

async function batchDel() {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除选中的 ${checkedIds.value.length} 条留言吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/gbook/batch-delete', { ids: checkedIds.value });
      msg.success('删除成功');
      checkedIds.value = [];
      load();
    },
  });
}

async function batchStatus(status: number) {
  await http.post('/admin/gbook/batch-status', { ids: checkedIds.value, status });
  msg.success('更新成功');
  checkedIds.value = [];
  load();
}

onMounted(() => load());
</script>
