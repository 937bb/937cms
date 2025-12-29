<template>
  <n-space vertical size="large">
    <n-card title="采集源管理">
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" @click="openCreate">新增采集源</n-button>
          <n-button secondary :loading="loading" @click="load">刷新</n-button>
        </n-space>
      </n-space>

      <n-data-table :columns="columns" :data="items" :bordered="false" :loading="loading" />
    </n-card>

    <n-modal
      v-model:show="showModal"
      preset="card"
      title="采集源"
      style="max-width: 720px; width: 100%"
    >
      <n-form :model="form" label-placement="left" label-width="130">
        <n-form-item label="名称">
          <n-input v-model:value="form.name" placeholder="例如：XX 资源站" />
        </n-form-item>
        <n-form-item label="接口地址">
          <n-input v-model:value="form.base_url" placeholder="例如：https://api.xxx.com" />
        </n-form-item>
        <n-form-item label="采集类型">
          <n-select v-model:value="form.collect_type" :options="collectTypeOptions" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="form.status" />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>

    <!-- 分类绑定弹窗 -->
    <n-modal
      v-model:show="showBindModal"
      preset="card"
      title="分类绑定"
      style="max-width: 1600px; width: 98%"
    >
      <n-space vertical size="large">
        <n-alert type="info" :bordered="false">
          勾选远程分类后，选择本地分类并点击"绑定选中项"进行批量绑定。或直接在表格中修改单条分类的绑定。
        </n-alert>
        <n-space align="center" wrap>
          <n-button type="primary" :loading="fetchingRemote" @click="fetchRemoteTypes"
            >刷新远程分类</n-button
          >
          <n-divider vertical />
          <n-checkbox v-model:checked="selectAll" @update:checked="toggleSelectAll"
            >全选</n-checkbox
          >
          <span>已选 {{ selectedRemoteIds.length }} 项</span>
          <n-divider vertical />
          <span>绑定到：</span>
          <n-select
            v-model:value="batchLocalType"
            :options="localTypeOptions"
            style="width: 220px"
            placeholder="选择本地分类"
          />
          <n-button
            type="info"
            @click="applyBatchBindSelected"
            :disabled="!selectedRemoteIds.length"
            >绑定选中项</n-button
          >
          <n-divider vertical />
          <span>复制自：</span>
          <n-select
            v-model:value="copyFromSourceId"
            :options="copySourceOptions"
            style="width: 220px"
            placeholder="选择采集源"
          />
          <n-button type="warning" @click="copyBindingsFromSource" :disabled="!copyFromSourceId"
            >一键复制</n-button
          >
        </n-space>
        <n-data-table
          :columns="bindColumns"
          :data="remoteTypes"
          :bordered="false"
          :loading="fetchingRemote"
          :row-key="(row: RemoteType) => row.type_id"
          v-model:checked-row-keys="selectedRemoteIds"
          max-height="60vh"
        />
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { NButton, NPopconfirm, NSelect, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type SourceItem = {
  id: number;
  name: string;
  base_url: string;
  collect_type: number;
  status: number;
  updated_at: number;
};

type TypeItem = {
  type_id: number;
  type_name: string;
  type_pid: number;
};

type RemoteType = {
  type_id: number;
  type_name: string;
  local_type_id: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const items = ref<SourceItem[]>([]);

// 分类绑定相关
const showBindModal = ref(false);
const fetchingRemote = ref(false);
const savingBinds = ref(false);
const currentSource = ref<SourceItem | null>(null);
const remoteTypes = ref<RemoteType[]>([]);
const localTypes = ref<TypeItem[]>([]);
const batchLocalType = ref<number>(0);
const selectedRemoteIds = ref<number[]>([]);
const selectAll = ref(false);
const copyFromSourceId = ref<number>(0);

const form = reactive<any>({
  id: 0,
  name: '',
  base_url: '',
  collect_type: 2,
  status: true,
});

const collectTypeOptions = [
  { label: '资源站JSON', value: 2 },
  { label: '资源站XML', value: 1 },
];

function openCreate() {
  Object.assign(form, { id: 0, name: '', base_url: '', collect_type: 2, status: true });
  showModal.value = true;
}

function openEdit(row: SourceItem) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    base_url: row.base_url,
    collect_type: Number(row.collect_type || 2),
    status: Number(row.status) === 1,
  });
  showModal.value = true;
}

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/collect/sources');
    items.value = (res.data?.items || []) as SourceItem[];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      ...form,
      status: form.status ? 1 : 0,
      collect_type: Number(form.collect_type || 2),
    };
    if (!payload.id) await http.post('/admin/collect/sources/create', payload);
    else await http.post('/admin/collect/sources/save', payload);
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
    await http.post('/admin/collect/sources/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

// 分类绑定功能
async function loadLocalTypes() {
  try {
    const res = await http.get('/admin/types');
    localTypes.value = (res.data?.items || []) as TypeItem[];
  } catch (e) {
    console.error('Failed to load local types', e);
  }
}

const localTypeOptions = computed<SelectOption[]>(() => {
  const byPid = new Map<number, TypeItem[]>();
  for (const t of localTypes.value) {
    const pid = Number(t.type_pid || 0);
    byPid.set(pid, [...(byPid.get(pid) || []), t]);
  }
  const opts: SelectOption[] = [{ label: '不绑定', value: 0 }];
  const walk = (pid: number, prefix: string) => {
    const children = byPid.get(pid) || [];
    for (const c of children) {
      opts.push({ label: `${prefix}${c.type_name}`, value: c.type_id });
      walk(c.type_id, `${prefix}—— `);
    }
  };
  walk(0, '');
  return opts;
});

const copySourceOptions = computed<SelectOption[]>(() => {
  return items.value
    .filter((item) => item.id !== currentSource.value?.id)
    .map((item) => ({
      label: item.name,
      value: item.id,
    }));
});

async function openBindModal(row: SourceItem) {
  currentSource.value = row;
  remoteTypes.value = [];
  selectedRemoteIds.value = [];
  selectAll.value = false;
  showBindModal.value = true;
  await loadLocalTypes();
  // 自动获取远程分类并合并已有绑定
  await fetchRemoteTypes();
}

async function fetchRemoteTypes() {
  if (!currentSource.value) return;
  fetchingRemote.value = true;
  try {
    // 先获取已有绑定
    const bindRes = await http.get('/admin/collect/type-bind/list', {
      params: { source_id: currentSource.value.id },
    });
    const bindings = (bindRes.data?.items || []) as Array<{
      remote_type_id: number;
      remote_type_name: string;
      local_type_id: number;
    }>;
    const bindMap = new Map(bindings.map((b) => [b.remote_type_id, b.local_type_id]));

    // 获取远程分类
    const res = await http.get('/admin/collect/type-bind/fetch-remote', {
      params: { base_url: currentSource.value.base_url },
    });
    const types = (res.data?.types || []) as Array<{ type_id: number; type_name: string }>;

    // 合并远程分类和已有绑定
    remoteTypes.value = types.map((t) => ({
      type_id: t.type_id,
      type_name: t.type_name,
      local_type_id: bindMap.get(t.type_id) || 0,
    }));
    msg.success(`获取到 ${types.length} 个远程分类`);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '获取远程分类失败'));
  } finally {
    fetchingRemote.value = false;
  }
}

async function saveAllBinds() {
  if (!currentSource.value) return;
  savingBinds.value = true;
  try {
    // 发送所有绑定，包括 local_type_id = 0 的绑定 (用于删除它们)
    const bindings = remoteTypes.value.map((r) => ({
      remote_type_id: r.type_id,
      remote_type_name: r.type_name,
      local_type_id: r.local_type_id,
    }));
    await http.post('/admin/collect/type-bind/save-batch', {
      source_id: currentSource.value.id,
      bindings,
    });
    msg.success('绑定保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    savingBinds.value = false;
  }
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedRemoteIds.value = remoteTypes.value.map((r) => r.type_id);
  } else {
    selectedRemoteIds.value = [];
  }
}

async function applyBatchBindSelected() {
  if (!batchLocalType.value && batchLocalType.value !== 0) {
    msg.warning('请先选择本地分类');
    return;
  }
  if (!selectedRemoteIds.value.length) {
    msg.warning('请先勾选要绑定的远程分类');
    return;
  }
  const selectedSet = new Set(selectedRemoteIds.value);
  let count = 0;
  for (const r of remoteTypes.value) {
    if (selectedSet.has(r.type_id)) {
      r.local_type_id = batchLocalType.value;
      count++;
    }
  }
  selectedRemoteIds.value = [];
  selectAll.value = false;
  // 自动保存到数据库
  await saveAllBinds();
}

async function saveSingleBind(remoteTypeId: number, remoteTypeName: string, localTypeId: number) {
  if (!currentSource.value) return;
  try {
    await http.post('/admin/collect/type-bind/save-batch', {
      source_id: currentSource.value.id,
      bindings: [
        {
          remote_type_id: remoteTypeId,
          remote_type_name: remoteTypeName,
          local_type_id: localTypeId,
        },
      ],
    });
    msg.success('绑定已保存');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  }
}

async function copyBindingsFromSource() {
  if (!copyFromSourceId.value) {
    msg.warning('请先选择要复制的采集源');
    return;
  }
  if (!currentSource.value) return;

  try {
    // 获取源采集源的绑定关系
    const bindRes = await http.get('/admin/collect/type-bind/list', {
      params: { source_id: copyFromSourceId.value },
    });
    const sourceBindings = (bindRes.data?.items || []) as Array<{
      remote_type_id: number;
      remote_type_name: string;
      local_type_id: number;
    }>;

    if (!sourceBindings.length) {
      msg.warning('源采集源没有绑定关系');
      return;
    }

    // 创建绑定名称映射
    const bindingMap = new Map(sourceBindings.map((b) => [b.remote_type_name, b.local_type_id]));

    // 匹配当前采集源的同名分类并复制绑定
    let copiedCount = 0;
    const newBindings = [];

    for (const remote of remoteTypes.value) {
      const localTypeId = bindingMap.get(remote.type_name);
      if (localTypeId !== undefined) {
        remote.local_type_id = localTypeId;
        copiedCount++;
        newBindings.push({
          remote_type_id: remote.type_id,
          remote_type_name: remote.type_name,
          local_type_id: localTypeId,
        });
      }
    }

    if (copiedCount === 0) {
      msg.warning('没有找到同名的分类');
      return;
    }

    // 保存复制的绑定
    await http.post('/admin/collect/type-bind/save-batch', {
      source_id: currentSource.value.id,
      bindings: newBindings,
    });

    msg.success(`成功复制 ${copiedCount} 个分类绑定`);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '复制失败'));
  }
}

const bindColumns: DataTableColumns<RemoteType> = [
  { type: 'selection' },
  { title: '远程分类ID', key: 'type_id', width: 120 },
  { title: '远程分类名称', key: 'type_name', minWidth: 200 },
  {
    title: '已绑定本地分类',
    key: 'local_type_id',
    width: 320,
    render: (row, index) =>
      h(
        'div',
        {
          style: `background-color: ${row.local_type_id === 0 ? '#fee' : 'transparent'}; padding: 4px; border-radius: 2px;`,
        },
        [
          h(NSelect, {
            value: row.local_type_id,
            options: localTypeOptions.value,
            style: 'width: 240px',
            onUpdateValue: async (val: number) => {
              remoteTypes.value[index].local_type_id = val;
              // 直接保存单条绑定
              await saveSingleBind(row.type_id, row.type_name, val);
            },
          }),
          row.local_type_id === 0
            ? h('span', { style: 'color: #f56a00; margin-left: 8px; font-size: 12px;' }, '未绑定')
            : null,
        ]
      ),
  },
];

const collectTypeMap: Record<number, string> = { 1: '资源站XML', 2: '资源站JSON' };

const columns: DataTableColumns<SourceItem> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '接口地址', key: 'base_url' },
  {
    title: '类型',
    key: 'collect_type',
    width: 120,
    render: (row) => collectTypeMap[row.collect_type] || '未知',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => (Number(row.status) ? '启用' : '禁用'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, type: 'info', onClick: () => openBindModal(row) },
          { default: () => '分类绑定' }
        ),
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row) },
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
            default: () => '确认删除该采集源？',
          }
        ),
      ]),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
