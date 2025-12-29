<template>
  <n-space vertical size="large">
    <n-card title="专题管理">
      <template #header-extra>
        <n-button type="primary" @click="openAdd">添加专题</n-button>
      </template>

      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索专题名"
          style="width: 200px"
          clearable
        />
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          style="width: 120px"
        />
        <n-button secondary :loading="loading" @click="load">查询</n-button>
      </n-space>

      <n-space style="margin-bottom: 12px">
        <n-button :disabled="selectedIds.length === 0" @click="batchEnable">批量启用</n-button>
        <n-button :disabled="selectedIds.length === 0" @click="batchDisable">批量禁用</n-button>
        <n-popconfirm @positive-click="batchDelete">
          <template #trigger>
            <n-button type="error" :disabled="selectedIds.length === 0">批量删除</n-button>
          </template>
          确认删除选中的 {{ selectedIds.length }} 个专题？
        </n-popconfirm>
      </n-space>

      <n-data-table
        remote
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: TopicRow) => row.topic_id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        :title="form.topic_id ? '编辑专题' : '添加专题'"
        closable
        style="width: 800px"
        @close="showModal = false"
      >
        <n-form :model="form" label-placement="left" label-width="100">
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="专题名称">
                <n-input v-model:value="form.topic_name" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="英文名">
                <n-input v-model:value="form.topic_en" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="副标题">
                <n-input v-model:value="form.topic_sub" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="首字母">
                <n-input v-model:value="form.topic_letter" placeholder="A-Z" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="状态">
                <n-radio-group v-model:value="form.topic_status">
                  <n-radio :value="1">启用</n-radio>
                  <n-radio :value="0">禁用</n-radio>
                </n-radio-group>
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="排序">
                <n-input-number v-model:value="form.topic_sort" :min="0" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="推荐等级">
                <n-input-number v-model:value="form.topic_level" :min="0" :max="9" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="分类ID">
                <n-input v-model:value="form.topic_type" placeholder="多个用逗号分隔" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="图片">
                <n-input v-model:value="form.topic_pic" placeholder="图片URL" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="简介">
                <n-input v-model:value="form.topic_blurb" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="内容">
                <n-input
                  v-model:value="form.topic_content"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 10 }"
                />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button secondary @click="showModal = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="save">保存</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, PaginationProps } from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type TopicRow = {
  topic_id: number;
  topic_name: string;
  topic_en: string;
  topic_pic: string;
  topic_status: number;
  topic_sort: number;
  topic_level: number;
  topic_hits: number;
  topic_time_add: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);

const items = ref<TopicRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const selectedIds = ref<number[]>([]);

const filters = reactive({ keyword: '', status: null as number | null });
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
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

const form = reactive<Record<string, any>>({
  topic_id: 0,
  topic_name: '',
  topic_en: '',
  topic_sub: '',
  topic_status: 1,
  topic_sort: 0,
  topic_letter: '',
  topic_level: 0,
  topic_type: '',
  topic_pic: '',
  topic_blurb: '',
  topic_content: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/topics', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        status: filters.status ?? undefined,
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

function openAdd() {
  Object.assign(form, {
    topic_id: 0,
    topic_name: '',
    topic_en: '',
    topic_sub: '',
    topic_status: 1,
    topic_sort: 0,
    topic_letter: '',
    topic_level: 0,
    topic_type: '',
    topic_pic: '',
    topic_blurb: '',
    topic_content: '',
  });
  showModal.value = true;
}

async function openEdit(id: number) {
  try {
    const res = await http.get('/admin/topics/detail', { params: { id } });
    const item = res.data?.item || {};
    Object.assign(form, {
      topic_id: item.topic_id || 0,
      topic_name: item.topic_name || '',
      topic_en: item.topic_en || '',
      topic_sub: item.topic_sub || '',
      topic_status: Number(item.topic_status) || 0,
      topic_sort: Number(item.topic_sort) || 0,
      topic_letter: item.topic_letter || '',
      topic_level: Number(item.topic_level) || 0,
      topic_type: item.topic_type || '',
      topic_pic: item.topic_pic || '',
      topic_blurb: item.topic_blurb || '',
      topic_content: item.topic_content || '',
    });
    showModal.value = true;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
  }
}

async function save() {
  if (!form.topic_name) {
    msg.warning('请输入专题名称');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/topics/save', form);
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
    await http.post('/admin/topics/delete', { topic_id: id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

function handleCheck(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[];
}

async function batchEnable() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/topics/batch-update-status', { ids: selectedIds.value, status: 1 });
    msg.success('批量启用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDisable() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/topics/batch-update-status', { ids: selectedIds.value, status: 0 });
    msg.success('批量禁用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/topics/batch-delete', { ids: selectedIds.value });
    msg.success('批量删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

function statusTag(status: number) {
  return Number(status)
    ? h(NTag, { type: 'success', size: 'small' }, { default: () => '启用' })
    : h(NTag, { type: 'default', size: 'small' }, { default: () => '禁用' });
}

const columns: DataTableColumns<TopicRow> = [
  { type: 'selection' },
  { title: 'ID', key: 'topic_id', width: 80 },
  { title: '专题名称', key: 'topic_name', minWidth: 200 },
  { title: '英文名', key: 'topic_en', width: 150 },
  { title: '排序', key: 'topic_sort', width: 80 },
  { title: '推荐', key: 'topic_level', width: 80 },
  { title: '点击', key: 'topic_hits', width: 100 },
  { title: '状态', key: 'topic_status', width: 80, render: (r) => statusTag(r.topic_status) },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row.topic_id) },
          { default: () => '编辑' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.topic_id) },
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
