<template>
  <n-space vertical size="large">
    <n-card title="下载器">
      <template #header-extra>
        <n-button type="primary" @click="openAdd">添加下载器</n-button>
      </template>

      <n-data-table :columns="columns" :data="items" :bordered="false" :loading="loading" />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        :title="form.id ? '编辑下载器' : '添加下载器'"
        closable
        style="width: 600px"
        @close="showModal = false"
      >
        <n-form :model="form" label-placement="left" label-width="100">
          <n-form-item label="编码">
            <n-input v-model:value="form.from_key" placeholder="唯一标识，如：thunder" />
          </n-form-item>
          <n-form-item label="显示名称">
            <n-input v-model:value="form.display_name" />
          </n-form-item>
          <n-form-item label="描述">
            <n-input v-model:value="form.description" />
          </n-form-item>
          <n-form-item label="提示信息">
            <n-input v-model:value="form.tip" />
          </n-form-item>
          <n-form-item label="解析地址">
            <n-input v-model:value="form.parse_url" placeholder="parse_mode=1时使用" />
          </n-form-item>
          <n-form-item label="解析模式">
            <n-radio-group v-model:value="form.parse_mode">
              <n-radio :value="0">直链</n-radio>
              <n-radio :value="1">解析</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="打开方式">
            <n-select
              v-model:value="form.target"
              :options="[
                { label: '当前窗口', value: '_self' },
                { label: '新窗口', value: '_blank' },
              ]"
            />
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
          <n-form-item label="自定义代码">
            <n-input
              v-model:value="form.downloader_code"
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
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type DownloaderRow = {
  id: number;
  from_key: string;
  display_name: string;
  description: string;
  parse_mode: number;
  status: number;
  sort: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const items = ref<DownloaderRow[]>([]);

const form = reactive({
  id: 0,
  from_key: '',
  display_name: '',
  description: '',
  tip: '',
  parse_url: '',
  parse_mode: 0,
  target: '_self',
  sort: 0,
  status: 1,
  downloader_code: '',
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/downloaders');
    items.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  Object.assign(form, {
    id: 0,
    from_key: '',
    display_name: '',
    description: '',
    tip: '',
    parse_url: '',
    parse_mode: 0,
    target: '_self',
    sort: 0,
    status: 1,
    downloader_code: '',
  });
  showModal.value = true;
}

async function openEdit(id: number) {
  try {
    const res = await http.get('/admin/downloaders/detail', { params: { id } });
    const item = res.data?.item || {};
    Object.assign(form, {
      id: item.id || 0,
      from_key: item.from_key || '',
      display_name: item.display_name || '',
      description: item.description || '',
      tip: item.tip || '',
      parse_url: item.parse_url || '',
      parse_mode: item.parse_mode ?? 0,
      target: item.target || '_self',
      sort: item.sort || 0,
      status: item.status ?? 1,
      downloader_code: item.downloader_code || '',
    });
    showModal.value = true;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
  }
}

async function save() {
  if (!form.from_key) {
    msg.warning('请输入编码');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/downloaders/save', form);
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
    await http.post('/admin/downloaders/delete', { id });
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

const columns: DataTableColumns<DownloaderRow> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '编码', key: 'from_key', width: 120 },
  { title: '显示名称', key: 'display_name', minWidth: 150 },
  { title: '描述', key: 'description', minWidth: 200 },
  { title: '模式', key: 'parse_mode', width: 80, render: (r) => (r.parse_mode ? '解析' : '直链') },
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
