<template>
  <n-space vertical size="large">
    <n-card title="角色库">
      <template #header-extra>
        <n-button type="primary" @click="openAdd">添加角色</n-button>
      </template>

      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索角色名"
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
          确认删除选中的 {{ selectedIds.length }} 个角色？
        </n-popconfirm>
      </n-space>

      <n-data-table
        remote
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: RoleRow) => row.role_id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        :title="form.role_id ? '编辑角色' : '添加角色'"
        closable
        style="width: 600px"
        @close="showModal = false"
      >
        <n-form :model="form" label-placement="left" label-width="100">
          <n-form-item label="角色名">
            <n-input v-model:value="form.role_name" />
          </n-form-item>
          <n-form-item label="英文名">
            <n-input v-model:value="form.role_en" />
          </n-form-item>
          <n-form-item label="首字母">
            <n-input v-model:value="form.role_letter" placeholder="A-Z" />
          </n-form-item>
          <n-form-item label="关联演员ID">
            <n-input-number v-model:value="form.role_actor_id" :min="0" />
          </n-form-item>
          <n-form-item label="演员名">
            <n-input v-model:value="form.role_actor_name" />
          </n-form-item>
          <n-form-item label="状态">
            <n-radio-group v-model:value="form.role_status">
              <n-radio :value="1">启用</n-radio>
              <n-radio :value="0">禁用</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="推荐等级">
            <n-input-number v-model:value="form.role_level" :min="0" :max="9" />
          </n-form-item>
          <n-form-item label="图片">
            <n-input v-model:value="form.role_pic" placeholder="图片URL" />
          </n-form-item>
          <n-form-item label="简介">
            <n-input v-model:value="form.role_blurb" />
          </n-form-item>
          <n-form-item label="详细介绍">
            <n-input
              v-model:value="form.role_content"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 10 }"
            />
          </n-form-item>
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

type RoleRow = {
  role_id: number;
  role_name: string;
  role_en: string;
  role_pic: string;
  role_actor_name: string;
  role_status: number;
  role_level: number;
  role_hits: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);

const items = ref<RoleRow[]>([]);
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
  role_id: 0,
  role_name: '',
  role_en: '',
  role_status: 1,
  role_letter: '',
  role_actor_id: 0,
  role_actor_name: '',
  role_pic: '',
  role_blurb: '',
  role_level: 0,
  role_content: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/roles', {
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
    role_id: 0,
    role_name: '',
    role_en: '',
    role_status: 1,
    role_letter: '',
    role_actor_id: 0,
    role_actor_name: '',
    role_pic: '',
    role_blurb: '',
    role_level: 0,
    role_content: '',
  });
  showModal.value = true;
}

async function openEdit(id: number) {
  try {
    const res = await http.get('/admin/roles/detail', { params: { id } });
    const item = res.data?.item || {};
    Object.assign(form, {
      role_id: item.role_id || 0,
      role_name: item.role_name || '',
      role_en: item.role_en || '',
      role_status: Number(item.role_status) || 0,
      role_letter: item.role_letter || '',
      role_actor_id: Number(item.role_actor_id) || 0,
      role_actor_name: item.role_actor_name || '',
      role_pic: item.role_pic || '',
      role_blurb: item.role_blurb || '',
      role_level: Number(item.role_level) || 0,
      role_content: item.role_content || '',
    });
    showModal.value = true;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
  }
}

async function save() {
  if (!form.role_name) {
    msg.warning('请输入角色名');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/roles/save', form);
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
    await http.post('/admin/roles/delete', { role_id: id });
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
    await http.post('/admin/roles/batch-update-status', { ids: selectedIds.value, status: 1 });
    msg.success('批量启用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDisable() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/roles/batch-update-status', { ids: selectedIds.value, status: 0 });
    msg.success('批量禁用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/roles/batch-delete', { ids: selectedIds.value });
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

const columns: DataTableColumns<RoleRow> = [
  { type: 'selection' },
  { title: 'ID', key: 'role_id', width: 80 },
  { title: '角色名', key: 'role_name', minWidth: 150 },
  { title: '英文名', key: 'role_en', width: 120 },
  { title: '演员', key: 'role_actor_name', width: 120 },
  { title: '推荐', key: 'role_level', width: 60 },
  { title: '点击', key: 'role_hits', width: 80 },
  { title: '状态', key: 'role_status', width: 80, render: (r) => statusTag(r.role_status) },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row.role_id) },
          { default: () => '编辑' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.role_id) },
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
