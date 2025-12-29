<template>
  <n-space vertical size="large">
    <n-card title="友情链接管理">
      <template #header-extra>
        <n-button type="primary" @click="openEdit()">添加链接</n-button>
      </template>

      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :row-key="(row: any) => row.id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEdit" preset="card" title="编辑链接" style="width: 500px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="名称" required>
          <n-input v-model:value="editForm.name" placeholder="链接名称" />
        </n-form-item>
        <n-form-item label="URL" required>
          <n-input v-model:value="editForm.url" placeholder="https://..." />
        </n-form-item>
        <n-form-item label="Logo">
          <n-input v-model:value="editForm.logo" placeholder="Logo图片URL（可选）" />
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="editForm.sort" :min="0" />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="editForm.status" :checked-value="1" :unchecked-value="0" />
        </n-form-item>
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
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NSpace, NSwitch, useMessage, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { http } from '../../lib/http';

const msg = useMessage();
const dialog = useDialog();
const loading = ref(false);
const saving = ref(false);
const list = ref<any[]>([]);
const showEdit = ref(false);
const editForm = reactive({
  id: 0,
  name: '',
  url: '',
  logo: '',
  sort: 0,
  status: 1,
});

const columns: DataTableColumns<any> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '名称', key: 'name', width: 150 },
  { title: 'URL', key: 'url', ellipsis: { tooltip: true } },
  { title: '排序', key: 'sort', width: 80 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) =>
      h(NSwitch, {
        value: row.status === 1,
        onUpdateValue: (v: boolean) => updateStatus(row.id, v ? 1 : 0),
      }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, {}, () => [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, () => '编辑'),
        h(
          NButton,
          { size: 'small', type: 'error', onClick: () => confirmDelete(row.id) },
          () => '删除'
        ),
      ]),
  },
];

async function loadList() {
  loading.value = true;
  try {
    const res = await http.get('/admin/links');
    list.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: any) {
  if (row) {
    Object.assign(editForm, row);
  } else {
    Object.assign(editForm, { id: 0, name: '', url: '', logo: '', sort: 0, status: 1 });
  }
  showEdit.value = true;
}

async function save() {
  if (!editForm.name || !editForm.url) {
    msg.warning('请填写名称和URL');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/links/save', editForm);
    msg.success('保存成功');
    showEdit.value = false;
    loadList();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function updateStatus(id: number, status: number) {
  try {
    await http.post('/admin/links/batch-update-status', { ids: [id], status });
    loadList();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '更新失败');
  }
}

function confirmDelete(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个链接吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await http.post('/admin/links/delete', { id });
        msg.success('删除成功');
        loadList();
      } catch (e: any) {
        msg.error(e?.response?.data?.message || '删除失败');
      }
    },
  });
}

function handleCheck(keys: (string | number)[]) {
  // 可以添加批量操作
}

onMounted(() => {
  loadList();
});
</script>
