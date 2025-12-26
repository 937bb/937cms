<template>
  <n-space vertical size="large">
    <n-card title="服务器组">
      <template #header-extra>
        <n-button type="primary" @click="openAdd">添加服务器组</n-button>
      </template>

      <n-data-table :columns="columns" :data="items" :bordered="false" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        :title="form.id ? '编辑服务器组' : '添加服务器组'"
        closable
        style="width: 500px"
        @close="showModal = false"
      >
        <n-form :model="form" label-placement="left" label-width="80">
          <n-form-item label="名称">
            <n-input v-model:value="form.name" />
          </n-form-item>
          <n-form-item label="备注">
            <n-input v-model:value="form.remark" />
          </n-form-item>
          <n-form-item label="排序">
            <n-input-number v-model:value="form.sort" :min="0" />
          </n-form-item>
          <n-form-item label="状态">
            <n-radio-group v-model:value="form.status">
              <n-radio :value="1">启用</n-radio>
              <n-radio :value="0">禁用</n-radio>
            </n-radio-group>
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
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type ServerGroupRow = { id: number; name: string; remark: string; sort: number; status: number };

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const items = ref<ServerGroupRow[]>([]);

const form = reactive({ id: 0, name: '', remark: '', sort: 0, status: 1 });

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/server-groups');
    items.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  Object.assign(form, { id: 0, name: '', remark: '', sort: 0, status: 1 });
  showModal.value = true;
}

async function openEdit(id: number) {
  try {
    const res = await http.get('/admin/server-groups/detail', { params: { id } });
    const item = res.data?.item || {};
    Object.assign(form, {
      id: item.id || 0,
      name: item.name || '',
      remark: item.remark || '',
      sort: item.sort || 0,
      status: item.status ?? 1,
    });
    showModal.value = true;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
  }
}

async function save() {
  if (!form.name) {
    msg.warning('请输入名称');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/server-groups/save', form);
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
    await http.post('/admin/server-groups/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

function statusTag(status: number) {
  return Number(status)
    ? h(NTag, { type: 'success', size: 'small' }, { default: () => '启用' })
    : h(NTag, { type: 'default', size: 'small' }, { default: () => '禁用' });
}

const columns: DataTableColumns<ServerGroupRow> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name', minWidth: 150 },
  { title: '备注', key: 'remark', minWidth: 200 },
  { title: '排序', key: 'sort', width: 80 },
  { title: '状态', key: 'status', width: 80, render: (r) => statusTag(r.status) },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row.id) },
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
