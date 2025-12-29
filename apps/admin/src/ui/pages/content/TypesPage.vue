<template>
  <n-space vertical size="large">
    <n-card title="分类管理">
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" @click="openCreate">新增分类</n-button>
          <n-button secondary :loading="loading" @click="load">刷新</n-button>
        </n-space>
      </n-space>

      <n-data-table :columns="columns" :data="flatWithDepth" :bordered="false" :loading="loading" />
    </n-card>

    <!-- 分类编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      title="分类"
      style="max-width: 720px; width: 100%"
    >
      <n-form :model="form" label-placement="left" label-width="120">
        <n-form-item label="名称">
          <n-input
            v-model:value="form.type_name"
            placeholder="例如：电影 / 动作片"
            @input="onNameInput"
          />
        </n-form-item>
        <n-form-item label="拼音别名">
          <n-input v-model:value="form.type_en" placeholder="自动生成，可手动修改" />
          <template #feedback>用于网址路径，如：dianying、dongzuopian</template>
        </n-form-item>
        <n-form-item label="上级分类">
          <n-tree-select
            v-model:value="form.type_pid"
            :options="typeTreeOptions"
            placeholder="顶级分类"
            clearable
          />
          <template #feedback>无需手写，直接选择树状结构。</template>
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="form.type_sort" :min="0" :max="1_000_000" />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="form.type_status" />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>

    <!-- 扩展配置弹窗 -->
    <n-modal
      v-model:show="showExtendModal"
      preset="card"
      title="扩展配置"
      style="max-width: 720px; width: 100%"
    >
      <n-alert type="info" style="margin-bottom: 16px">
        扩展配置用于前台筛选功能，多个选项用英文逗号分隔。子分类会继承父分类的配置。
      </n-alert>
      <n-form :model="extendForm" label-placement="left" label-width="100">
        <n-form-item label="剧情/类型">
          <n-input
            v-model:value="extendForm.class"
            type="textarea"
            :rows="2"
            placeholder="动作,喜剧,爱情,科幻,恐怖,战争,犯罪"
          />
        </n-form-item>
        <n-form-item label="地区">
          <n-input
            v-model:value="extendForm.area"
            type="textarea"
            :rows="2"
            placeholder="大陆,香港,台湾,美国,韩国,日本,泰国,印度,英国,法国"
          />
        </n-form-item>
        <n-form-item label="语言">
          <n-input
            v-model:value="extendForm.lang"
            type="textarea"
            :rows="2"
            placeholder="国语,粤语,英语,韩语,日语,其他"
          />
        </n-form-item>
        <n-form-item label="年份">
          <n-input
            v-model:value="extendForm.year"
            type="textarea"
            :rows="2"
            placeholder="2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010"
          />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showExtendModal = false">取消</n-button>
        <n-button type="primary" :loading="savingExtend" @click="saveExtend">保存</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns, TreeSelectOption } from 'naive-ui';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { pinyin } from 'pinyin-pro';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type TypeItem = {
  type_id: number;
  type_name: string;
  type_en: string;
  type_pid: number;
  type_sort: number;
  type_status: number;
  type_extend?: string;
};

type WithDepth = TypeItem & { depth: number };

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const savingExtend = ref(false);
const showModal = ref(false);
const showExtendModal = ref(false);
const items = ref<TypeItem[]>([]);
const currentExtendTypeId = ref(0);

const form = reactive<any>({
  type_id: 0,
  type_name: '',
  type_en: '',
  type_pid: 0,
  type_sort: 0,
  type_status: true,
});

const extendForm = reactive({
  class: '',
  area: '',
  lang: '',
  year: '',
});

function openCreate() {
  Object.assign(form, {
    type_id: 0,
    type_name: '',
    type_en: '',
    type_pid: 0,
    type_sort: 0,
    type_status: true,
  });
  showModal.value = true;
}

function onNameInput(val: string) {
  if (!form.type_id) {
    form.type_en = pinyin(val, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  }
}

function openEdit(row: TypeItem) {
  Object.assign(form, {
    type_id: row.type_id,
    type_name: row.type_name,
    type_en: row.type_en,
    type_pid: Number(row.type_pid || 0),
    type_sort: Number(row.type_sort || 0),
    type_status: Number(row.type_status) === 1,
  });
  showModal.value = true;
}

async function openExtend(row: TypeItem) {
  currentExtendTypeId.value = row.type_id;
  Object.assign(extendForm, { class: '', area: '', lang: '', year: '' });
  try {
    const res = await http.get(`/admin/types/extend/${row.type_id}`);
    const ext = res.data?.extend || {};
    extendForm.class = Array.isArray(ext.class) ? ext.class.join(',') : ext.class || '';
    extendForm.area = Array.isArray(ext.area) ? ext.area.join(',') : ext.area || '';
    extendForm.lang = Array.isArray(ext.lang) ? ext.lang.join(',') : ext.lang || '';
    extendForm.year = Array.isArray(ext.year) ? ext.year.join(',') : ext.year || '';
  } catch {
    // 忽略
  }
  showExtendModal.value = true;
}

async function saveExtend() {
  savingExtend.value = true;
  try {
    await http.post('/admin/types/save-extend', {
      type_id: currentExtendTypeId.value,
      extend: {
        class: extendForm.class,
        area: extendForm.area,
        lang: extendForm.lang,
        year: extendForm.year,
      },
    });
    msg.success('保存成功');
    showExtendModal.value = false;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    savingExtend.value = false;
  }
}

function buildTreeOptions(list: TypeItem[]): TreeSelectOption[] {
  const byPid = new Map<number, TypeItem[]>();
  for (const t of list) {
    const pid = Number(t.type_pid || 0);
    byPid.set(pid, [...(byPid.get(pid) || []), t]);
  }
  const sortChildren = (arr: TypeItem[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          Number(a.type_sort || 0) - Number(b.type_sort || 0) ||
          Number(a.type_id) - Number(b.type_id)
      );

  const walk = (pid: number): TreeSelectOption[] => {
    const children = sortChildren(byPid.get(pid) || []);
    return children.map((c) => ({
      label: c.type_name,
      key: c.type_id,
      children: walk(c.type_id),
    }));
  };

  return [{ label: '顶级分类', key: 0, children: walk(0) }];
}

const typeTreeOptions = computed(() => buildTreeOptions(items.value));

const flatWithDepth = computed<WithDepth[]>(() => {
  const list = items.value.slice();
  const byPid = new Map<number, TypeItem[]>();
  for (const t of list) {
    const pid = Number(t.type_pid || 0);
    byPid.set(pid, [...(byPid.get(pid) || []), t]);
  }
  const sortChildren = (arr: TypeItem[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          Number(a.type_sort || 0) - Number(b.type_sort || 0) ||
          Number(a.type_id) - Number(b.type_id)
      );

  const out: WithDepth[] = [];
  const walk = (pid: number, depth: number) => {
    const children = sortChildren(byPid.get(pid) || []);
    for (const c of children) {
      out.push({ ...c, depth });
      walk(c.type_id, depth + 1);
    }
  };
  walk(0, 0);
  return out;
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/types');
    const tree = res.data?.items || [];
    const flat: TypeItem[] = [];
    for (const p of tree) {
      flat.push(p);
      if (p.children) flat.push(...p.children);
    }
    items.value = flat;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!String(form.type_name || '').trim()) {
    msg.warning('请输入分类名称');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...form,
      type_pid: Number(form.type_pid || 0),
      type_sort: Number(form.type_sort || 0),
      type_status: form.type_status ? 1 : 0,
    };
    await http.post('/admin/types/save', payload);
    msg.success('保存成功');
    showModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function remove(typeId: number) {
  try {
    await http.post('/admin/types/delete', { type_id: typeId });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

const columns: DataTableColumns<WithDepth> = [
  { title: 'ID', key: 'type_id', width: 80 },
  {
    title: '分类名称',
    key: 'type_name',
    minWidth: 200,
    render: (row) => {
      const prefix = row.depth ? `${'—'.repeat(row.depth * 2)} ` : '';
      return `${prefix}${row.type_name}`;
    },
  },
  { title: '排序', key: 'type_sort', width: 80 },
  {
    title: '状态',
    key: 'type_status',
    width: 80,
    render: (r) => (Number(r.type_status) ? '启用' : '禁用'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    render: (row) =>
      h(
        'div',
        { style: 'display:flex; gap:8px;' },
        [
          h(
            NButton,
            { size: 'small', tertiary: true, onClick: () => openEdit(row) },
            { default: () => '编辑' }
          ),
          row.depth === 0
            ? h(
                NButton,
                { size: 'small', tertiary: true, type: 'info', onClick: () => openExtend(row) },
                { default: () => '扩展配置' }
              )
            : null,
          h(
            NPopconfirm,
            { onPositiveClick: () => remove(row.type_id) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', tertiary: true, type: 'error' },
                  { default: () => '删除' }
                ),
              default: () => '确认删除该分类？',
            }
          ),
        ].filter(Boolean)
      ),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
