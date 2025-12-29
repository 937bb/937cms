<template>
  <n-space vertical size="large">
    <n-card title="资讯管理">
      <template #header-extra>
        <n-space>
          <n-input
            v-model:value="keyword"
            placeholder="搜索标题/标签"
            clearable
            style="width: 200px"
            @keyup.enter="search"
          />
          <n-select
            v-model:value="statusFilter"
            :options="statusOptions"
            placeholder="状态"
            clearable
            style="width: 100px"
          />
          <n-button @click="search">搜索</n-button>
          <n-button type="primary" @click="openEdit()">添加资讯</n-button>
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
          <n-button :disabled="!checkedIds.length" @click="batchStatus(1)">批量启用</n-button>
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

    <n-modal
      v-model:show="showEdit"
      preset="card"
      :title="editForm.id ? '编辑资讯' : '添加资讯'"
      style="width: 800px"
    >
      <n-form ref="formRef" :model="editForm" label-placement="left" label-width="80">
        <n-form-item label="标题" path="name">
          <n-input v-model:value="editForm.name" placeholder="资讯标题" />
        </n-form-item>
        <n-form-item label="分类">
          <n-input-number v-model:value="editForm.typeId" :min="0" placeholder="分类ID" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="作者">
              <n-input v-model:value="editForm.author" placeholder="作者" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="来源">
              <n-input v-model:value="editForm.source" placeholder="来源" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="图片">
          <n-input v-model:value="editForm.pic" placeholder="图片URL" />
        </n-form-item>
        <n-form-item label="标签">
          <n-input v-model:value="editForm.tag" placeholder="多个标签用逗号分隔" />
        </n-form-item>
        <n-form-item label="简介">
          <n-input v-model:value="editForm.blurb" type="textarea" :rows="2" placeholder="简介" />
        </n-form-item>
        <n-form-item label="内容">
          <n-input v-model:value="editForm.content" type="textarea" :rows="8" placeholder="内容" />
        </n-form-item>
        <n-grid :cols="3" :x-gap="16">
          <n-gi>
            <n-form-item label="推荐等级">
              <n-input-number v-model:value="editForm.level" :min="0" :max="9" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="状态">
              <n-switch v-model:value="editForm.status" :checked-value="1" :unchecked-value="0" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEdit = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="save">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { NButton, NSpace, NTag, useMessage, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { http } from '../../../lib/http';

const msg = useMessage();
const dialog = useDialog();

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const statusFilter = ref<number | null>(null);
const checkedIds = ref<number[]>([]);

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const columns: DataTableColumns<any> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '标题', key: 'name', ellipsis: { tooltip: true } },
  { title: '作者', key: 'author', width: 100 },
  { title: '点击', key: 'hits', width: 80 },
  { title: '推荐', key: 'level', width: 60 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) =>
      h(NTag, { type: row.status ? 'success' : 'default', size: 'small' }, () =>
        row.status ? '启用' : '禁用'
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, () => '编辑'),
        h(NButton, { size: 'small', type: 'error', onClick: () => del(row.id) }, () => '删除'),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/articles', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined,
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

// 编辑
const showEdit = ref(false);
const saving = ref(false);
const editForm = ref<any>({});

function openEdit(row?: any) {
  if (row) {
    editForm.value = { ...row };
  } else {
    editForm.value = {
      typeId: 0,
      name: '',
      author: '',
      source: '',
      pic: '',
      tag: '',
      blurb: '',
      content: '',
      level: 0,
      status: 1,
    };
  }
  showEdit.value = true;
}

async function save() {
  if (!editForm.value.name) {
    msg.warning('请输入标题');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/articles/save', editForm.value);
    msg.success('保存成功');
    showEdit.value = false;
    load();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function del(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条资讯吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/articles/delete', { id });
      msg.success('删除成功');
      load();
    },
  });
}

async function batchDel() {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除选中的 ${checkedIds.value.length} 条资讯吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await http.post('/admin/articles/batch-delete', { ids: checkedIds.value });
      msg.success('删除成功');
      checkedIds.value = [];
      load();
    },
  });
}

async function batchStatus(status: number) {
  await http.post('/admin/articles/batch-status', { ids: checkedIds.value, status });
  msg.success('更新成功');
  checkedIds.value = [];
  load();
}

onMounted(() => load());
</script>
