<template>
  <n-space vertical size="large">
    <n-card title="播放器管理">
      <!-- 顶部操作栏 -->
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" @click="openCreate">新增播放器</n-button>
          <n-button secondary :loading="loading" @click="load">刷新</n-button>
        </n-space>
        <n-space>
          <!-- 批量操作 -->
          <n-button :disabled="selectedKeys.length === 0" @click="batchEnable">批量启用</n-button>
          <n-button :disabled="selectedKeys.length === 0" @click="batchDisable">批量禁用</n-button>
          <n-popconfirm @positive-click="batchDelete">
            <template #trigger>
              <n-button type="error" :disabled="selectedKeys.length === 0">批量删除</n-button>
            </template>
            确认删除选中的 {{ selectedKeys.length }} 个播放器？
          </n-popconfirm>
          <n-divider vertical />
          <!-- 导入导出 -->
          <n-button @click="showImportModal = true">导入配置</n-button>
          <n-button @click="exportAll">导出全部</n-button>
        </n-space>
      </n-space>

      <!-- 播放器列表 -->
      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="(row: PlayerItem) => row.from_key"
        @update:checked-row-keys="handleCheck"
      />

      <!-- 播放模式说明 -->
      <n-alert type="info" title="播放模式说明" style="margin-top: 16px">
        <n-space vertical :size="4">
          <div><strong>直链模式</strong>：视频地址直接传给播放器播放，适用于直链资源</div>
          <div><strong>解析模式</strong>：视频地址先经过解析接口处理后播放</div>
        </n-space>
      </n-alert>
    </n-card>

    <!-- 新增/编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="form._editing ? '编辑播放器' : '新增播放器'"
      style="max-width: 800px; width: 100%"
    >
      <n-form :model="form" label-placement="left" label-width="140">
        <n-form-item label="播放器编码" required>
          <n-input
            v-model:value="form.from_key"
            :disabled="!!form._editing"
            placeholder="例如：ckm3u8 / dbm3u8 / qq"
          />
          <template #feedback
            >对应采集资源的播放来源标识，用于匹配播放源。只能包含字母、数字、下划线。</template
          >
        </n-form-item>
        <n-form-item label="显示名称">
          <n-input v-model:value="form.display_name" placeholder="例如：CK资源 / 腾讯视频" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="form.description" placeholder="播放器描述信息" />
        </n-form-item>
        <n-form-item label="提示信息">
          <n-input v-model:value="form.tip" placeholder="例如：无需安装任何插件" />
        </n-form-item>
        <n-form-item label="播放模式">
          <n-radio-group v-model:value="form.parse_mode">
            <n-radio-button :value="0">直链播放</n-radio-button>
            <n-radio-button :value="1">解析播放</n-radio-button>
          </n-radio-group>
          <template #feedback>
            {{ form.parse_mode === 0 ? '直接播放视频地址' : '通过解析接口处理后播放' }}
          </template>
        </n-form-item>
        <n-form-item v-if="Number(form.parse_mode) === 1" label="解析地址">
          <n-input
            v-model:value="form.parse_url"
            placeholder="例如：https://jx.example.com/?url="
          />
          <template #feedback>解析接口地址，视频地址会拼接在后面</template>
        </n-form-item>
        <n-form-item label="打开方式">
          <n-radio-group v-model:value="form.target">
            <n-radio-button value="_self">当前窗口</n-radio-button>
            <n-radio-button value="_blank">新窗口</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="form.sort" :min="0" :max="1000000" />
          <template #feedback>数值越大越靠前</template>
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="form.status" />
          <span style="margin-left: 8px">{{ form.status ? '启用' : '禁用' }}</span>
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>

    <!-- 导入弹窗 -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="导入播放器配置"
      style="max-width: 600px; width: 100%"
    >
      <div
        style="
          border: 2px dashed #d9d9d9;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
        "
        @click="($refs.fileInput as HTMLInputElement)?.click()"
        @dragover.prevent="$event.currentTarget.style.borderColor = '#18a058'"
        @dragleave="$event.currentTarget.style.borderColor = '#d9d9d9'"
        @drop.prevent="handleFileDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.json"
          style="display: none"
          @change="handleFileInput"
        />
        <n-icon size="48" :depth="3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
          </svg>
        </n-icon>
        <p style="margin: 8px 0 0; color: #666">点击选择文件 或 拖拽文件到此处</p>
        <p style="margin: 4px 0 0; color: #999; font-size: 12px">支持 .txt 或 .json 格式</p>
      </div>
      <n-divider>或手动粘贴</n-divider>
      <n-input
        v-model:value="importData"
        type="textarea"
        :rows="4"
        placeholder="粘贴导出的配置数据"
      />
      <n-form-item label="覆盖已存在" style="margin-top: 12px">
        <n-switch v-model:value="importOverwrite" />
        <span style="margin-left: 8px">{{ importOverwrite ? '覆盖' : '跳过' }}已存在的播放器</span>
      </n-form-item>
      <n-space justify="end">
        <n-button secondary @click="showImportModal = false">取消</n-button>
        <n-button type="primary" :loading="importing" @click="doImport">导入</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
/**
 * 播放器管理页面
 * 功能：列表、新增、编辑、删除、批量操作、导入导出
 */
import type { DataTableColumns, DataTableRowKey } from 'naive-ui';
import { NButton, NIcon, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { http } from '../../lib/http';

// 播放器数据类型
type PlayerItem = {
  from_key: string;
  display_name: string;
  description: string;
  tip: string;
  parse_url: string;
  parse_mode: number;
  target: string;
  player_code: string;
  sort: number;
  status: number;
  created_at: number;
  updated_at: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const showModal = ref(false);
const showImportModal = ref(false);
const items = ref<PlayerItem[]>([]);
const selectedKeys = ref<string[]>([]);
const importData = ref('');
const importOverwrite = ref(false);

// 表单数据
const form = reactive<any>({
  _editing: false,
  from_key: '',
  display_name: '',
  description: '',
  tip: '',
  parse_url: '',
  parse_mode: 0,
  target: '_self',
  player_code: '',
  sort: 0,
  status: true,
});

// 重置表单
function resetForm() {
  Object.assign(form, {
    _editing: false,
    from_key: '',
    display_name: '',
    description: '',
    tip: '',
    parse_url: '',
    parse_mode: 0,
    target: '_self',
    player_code: '',
    sort: 0,
    status: true,
  });
}

// 打开新增弹窗
function openCreate() {
  resetForm();
  showModal.value = true;
}

// 打开编辑弹窗
function openEdit(row: PlayerItem) {
  Object.assign(form, {
    _editing: true,
    from_key: row.from_key,
    display_name: row.display_name,
    description: row.description || '',
    tip: row.tip || '',
    parse_url: row.parse_url,
    parse_mode: Number(row.parse_mode || 0),
    target: row.target || '_self',
    player_code: row.player_code || '',
    sort: Number(row.sort || 0),
    status: Number(row.status) === 1,
  });
  showModal.value = true;
}

// 加载列表
async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/players');
    items.value = (res.data || []) as PlayerItem[];
    selectedKeys.value = [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

// 保存播放器
async function save() {
  if (!String(form.from_key || '').trim()) {
    msg.warning('播放器编码不能为空');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/players/save', {
      from_key: String(form.from_key).trim(),
      display_name: String(form.display_name || '').trim(),
      description: String(form.description || '').trim(),
      tip: String(form.tip || '').trim(),
      parse_url: String(form.parse_url || '').trim(),
      parse_mode: Number(form.parse_mode || 0),
      target: String(form.target || '_self'),
      player_code: String(form.player_code || '').trim(),
      sort: Number(form.sort || 0),
      status: form.status ? 1 : 0,
    });
    msg.success('保存成功');
    showModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

// 删除单个播放器
async function remove(fromKey: string) {
  try {
    await http.post('/admin/players/delete', { from_key: fromKey });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

// 处理选中
function handleCheck(keys: DataTableRowKey[]) {
  selectedKeys.value = keys as string[];
}

// 批量启用
async function batchEnable() {
  if (selectedKeys.value.length === 0) return;
  try {
    await http.post('/admin/players/batch-update-field', {
      from_keys: selectedKeys.value,
      field: 'status',
      value: 1,
    });
    msg.success('批量启用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量禁用
async function batchDisable() {
  if (selectedKeys.value.length === 0) return;
  try {
    await http.post('/admin/players/batch-update-field', {
      from_keys: selectedKeys.value,
      field: 'status',
      value: 0,
    });
    msg.success('批量禁用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量删除
async function batchDelete() {
  if (selectedKeys.value.length === 0) return;
  try {
    await http.post('/admin/players/batch-delete', {
      from_keys: selectedKeys.value,
    });
    msg.success('批量删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 导出全部
async function exportAll() {
  try {
    const res = await http.get('/admin/players/export-all-json');
    const data = res.data?.data || '';
    // 复制到剪贴板
    await navigator.clipboard.writeText(data);
    msg.success('配置已复制到剪贴板');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '导出失败'));
  }
}

// 导出单个
async function exportOne(fromKey: string) {
  try {
    const res = await http.get(`/admin/players/export-json/${fromKey}`);
    const data = res.data?.data || '';
    await navigator.clipboard.writeText(data);
    msg.success('配置已复制到剪贴板');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '导出失败'));
  }
}

// 执行导入
async function doImport() {
  if (!importData.value.trim()) {
    msg.warning('请粘贴配置数据');
    return;
  }
  importing.value = true;
  try {
    const res = await http.post('/admin/players/import', {
      data: importData.value.trim(),
      overwrite: importOverwrite.value,
    });
    msg.success(`导入成功：${res.data?.imported || 0} 个，跳过：${res.data?.skipped || 0} 个`);
    showImportModal.value = false;
    importData.value = '';
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '导入失败'));
  } finally {
    importing.value = false;
  }
}

// 读取文件内容
function readFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    importData.value = String(e.target?.result || '').trim();
    msg.success('文件已读取，请点击导入按钮');
  };
  reader.onerror = () => msg.error('文件读取失败');
  reader.readAsText(file);
}

// 处理文件选择
function handleFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

// 处理文件拖拽
function handleFileDrop(e: DragEvent) {
  (e.currentTarget as HTMLElement).style.borderColor = '#d9d9d9';
  const file = e.dataTransfer?.files?.[0];
  if (file) readFile(file);
}

// 状态标签
function statusTag(status: number) {
  return Number(status)
    ? h(NTag, { type: 'success', size: 'small' }, { default: () => '启用' })
    : h(NTag, { type: 'default', size: 'small' }, { default: () => '禁用' });
}

// 播放模式标签
function modeTag(mode: number) {
  return Number(mode)
    ? h(NTag, { type: 'info', size: 'small' }, { default: () => '解析' })
    : h(NTag, { type: 'warning', size: 'small' }, { default: () => '直链' });
}

// 表格列定义
const columns: DataTableColumns<PlayerItem> = [
  { type: 'selection' },
  { title: '播放器编码', key: 'from_key', width: 120 },
  { title: '显示名称', key: 'display_name', width: 140 },
  { title: '描述', key: 'description', width: 160, ellipsis: { tooltip: true } },
  { title: '播放模式', key: 'parse_mode', width: 80, render: (r) => modeTag(Number(r.parse_mode)) },
  { title: '解析地址', key: 'parse_url', minWidth: 200, ellipsis: { tooltip: true } },
  { title: '排序', key: 'sort', width: 80 },
  { title: '状态', key: 'status', width: 80, render: (r) => statusTag(Number(r.status)) },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row) },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => exportOne(row.from_key) },
          { default: () => '导出' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.from_key) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除该播放器？',
          }
        ),
      ]),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
