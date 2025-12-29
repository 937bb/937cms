<template>
  <n-space vertical size="large">
    <n-card title="演员库">
      <template #header-extra>
        <n-button type="primary" @click="openAdd">添加演员</n-button>
      </template>

      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索演员名"
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
          确认删除选中的 {{ selectedIds.length }} 个演员？
        </n-popconfirm>
      </n-space>

      <n-data-table
        remote
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: ActorRow) => row.actor_id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        :title="form.actor_id ? '编辑演员' : '添加演员'"
        closable
        style="width: 800px"
        @close="showModal = false"
      >
        <n-form :model="form" label-placement="left" label-width="100">
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="演员名">
                <n-input v-model:value="form.actor_name" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="英文名">
                <n-input v-model:value="form.actor_en" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="别名">
                <n-input v-model:value="form.actor_alias" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="首字母">
                <n-input v-model:value="form.actor_letter" placeholder="A-Z" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="性别">
                <n-select
                  v-model:value="form.actor_sex"
                  :options="[
                    { label: '男', value: '男' },
                    { label: '女', value: '女' },
                  ]"
                  clearable
                />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="地区">
                <n-input v-model:value="form.actor_area" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="生日">
                <n-input v-model:value="form.actor_birthday" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="星座">
                <n-input v-model:value="form.actor_starsign" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="身高">
                <n-input v-model:value="form.actor_height" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="体重">
                <n-input v-model:value="form.actor_weight" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="状态">
                <n-radio-group v-model:value="form.actor_status">
                  <n-radio :value="1">启用</n-radio>
                  <n-radio :value="0">禁用</n-radio>
                </n-radio-group>
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="推荐等级">
                <n-input-number v-model:value="form.actor_level" :min="0" :max="9" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="图片">
                <n-input v-model:value="form.actor_pic" placeholder="图片URL" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="代表作">
                <n-input v-model:value="form.actor_works" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="简介">
                <n-input v-model:value="form.actor_blurb" />
              </n-form-item>
            </n-gi>
            <n-gi :span="2">
              <n-form-item label="详细介绍">
                <n-input
                  v-model:value="form.actor_content"
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

type ActorRow = {
  actor_id: number;
  actor_name: string;
  actor_en: string;
  actor_pic: string;
  actor_sex: string;
  actor_area: string;
  actor_status: number;
  actor_level: number;
  actor_hits: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);

const items = ref<ActorRow[]>([]);
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
  actor_id: 0,
  actor_name: '',
  actor_en: '',
  actor_alias: '',
  actor_status: 1,
  actor_letter: '',
  actor_sex: '',
  actor_pic: '',
  actor_blurb: '',
  actor_area: '',
  actor_height: '',
  actor_weight: '',
  actor_birthday: '',
  actor_starsign: '',
  actor_works: '',
  actor_level: 0,
  actor_content: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/actors', {
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
    actor_id: 0,
    actor_name: '',
    actor_en: '',
    actor_alias: '',
    actor_status: 1,
    actor_letter: '',
    actor_sex: '',
    actor_pic: '',
    actor_blurb: '',
    actor_area: '',
    actor_height: '',
    actor_weight: '',
    actor_birthday: '',
    actor_starsign: '',
    actor_works: '',
    actor_level: 0,
    actor_content: '',
  });
  showModal.value = true;
}

async function openEdit(id: number) {
  try {
    const res = await http.get('/admin/actors/detail', { params: { id } });
    const item = res.data?.item || {};
    Object.assign(form, {
      actor_id: item.actor_id || 0,
      actor_name: item.actor_name || '',
      actor_en: item.actor_en || '',
      actor_alias: item.actor_alias || '',
      actor_status: Number(item.actor_status) || 0,
      actor_letter: item.actor_letter || '',
      actor_sex: item.actor_sex || '',
      actor_pic: item.actor_pic || '',
      actor_blurb: item.actor_blurb || '',
      actor_area: item.actor_area || '',
      actor_height: item.actor_height || '',
      actor_weight: item.actor_weight || '',
      actor_birthday: item.actor_birthday || '',
      actor_starsign: item.actor_starsign || '',
      actor_works: item.actor_works || '',
      actor_level: Number(item.actor_level) || 0,
      actor_content: item.actor_content || '',
    });
    showModal.value = true;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
  }
}

async function save() {
  if (!form.actor_name) {
    msg.warning('请输入演员名');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/actors/save', form);
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
    await http.post('/admin/actors/delete', { actor_id: id });
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
    await http.post('/admin/actors/batch-update-status', { ids: selectedIds.value, status: 1 });
    msg.success('批量启用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDisable() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/actors/batch-update-status', { ids: selectedIds.value, status: 0 });
    msg.success('批量禁用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await http.post('/admin/actors/batch-delete', { ids: selectedIds.value });
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

const columns: DataTableColumns<ActorRow> = [
  { type: 'selection' },
  { title: 'ID', key: 'actor_id', width: 80 },
  { title: '演员名', key: 'actor_name', minWidth: 150 },
  { title: '英文名', key: 'actor_en', width: 120 },
  { title: '性别', key: 'actor_sex', width: 60 },
  { title: '地区', key: 'actor_area', width: 80 },
  { title: '推荐', key: 'actor_level', width: 60 },
  { title: '点击', key: 'actor_hits', width: 80 },
  { title: '状态', key: 'actor_status', width: 80, render: (r) => statusTag(r.actor_status) },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row.actor_id) },
          { default: () => '编辑' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.actor_id) },
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
