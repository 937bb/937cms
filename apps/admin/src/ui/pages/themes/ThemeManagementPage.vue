<template>
  <n-space vertical size="large">
    <n-card title="主题管理">
      <template #header-extra>
        <n-button type="primary" @click="showInstallModal = true">
          <template #icon>
            <n-icon><AddIcon /></n-icon>
          </template>
          安装主题
        </n-button>
      </template>

      <n-data-table
        :columns="columns"
        :data="themes"
        :loading="loading"
        :row-key="(row: any) => row.id"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>

    <!-- 安装主题模态框 -->
    <n-modal
      v-model:show="showInstallModal"
      title="安装新主题"
      preset="dialog"
      positive-text="安装"
      negative-text="取消"
      @positive-click="handleInstall"
      @negative-click="showInstallModal = false"
    >
      <n-form ref="installFormRef" :model="installForm" :rules="installRules">
        <n-form-item label="主题ID" path="themeId">
          <n-input v-model:value="installForm.themeId" placeholder="例如: my-theme" />
        </n-form-item>
        <n-form-item label="主题名称" path="name">
          <n-input v-model:value="installForm.name" placeholder="例如: 我的主题" />
        </n-form-item>
        <n-form-item label="版本" path="version">
          <n-input v-model:value="installForm.version" placeholder="例如: 1.0.0" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="installForm.description" type="textarea" placeholder="主题描述" />
        </n-form-item>
        <n-form-item label="作者" path="author">
          <n-input v-model:value="installForm.author" placeholder="作者名称" />
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 编辑配置模态框 -->
    <n-modal
      v-model:show="showConfigModal"
      :title="`编辑 ${editingTheme?.name} 配置`"
      preset="dialog"
      positive-text="保存"
      negative-text="取消"
      @positive-click="handleSaveConfig"
      @negative-click="showConfigModal = false"
    >
      <n-space vertical size="large">
        <div v-for="(field, key) in editingTheme?.configSchema" :key="key">
          <n-form-item :label="field.label">
            <component
              :is="getFieldComponent(field.type)"
              v-model:value="editingConfig[key]"
              :field="field"
              :placeholder="field.description"
            />
          </n-form-item>
        </div>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import {
  NButton,
  NSpace,
  NCard,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NTag,
  NIcon,
  useMessage,
  useDialog,
} from 'naive-ui';
import { Add as AddIcon } from '@vicons/tabler';
import type { DataTableColumns, FormInst } from 'naive-ui';
import { http } from '../../../lib/http';
import ThemeFieldString from './components/ThemeFieldString.vue';
import ThemeFieldNumber from './components/ThemeFieldNumber.vue';
import ThemeFieldBoolean from './components/ThemeFieldBoolean.vue';
import ThemeFieldColor from './components/ThemeFieldColor.vue';
import ThemeFieldSelect from './components/ThemeFieldSelect.vue';
import ThemeFieldTextarea from './components/ThemeFieldTextarea.vue';

const msg = useMessage();
const dialog = useDialog();
const loading = ref(false);
const themes = ref<any[]>([]);
const showInstallModal = ref(false);
const showConfigModal = ref(false);
const installFormRef = ref<FormInst>();
const editingTheme = ref<any>(null);
const editingConfig = ref<Record<string, any>>({});

const installForm = ref({
  themeId: '',
  name: '',
  version: '1.0.0',
  description: '',
  author: '',
  configSchema: {},
});

const installRules = {
  themeId: [{ required: true, message: '请输入主题ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入主题名称', trigger: 'blur' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
};

const columns: DataTableColumns<any> = [
  { title: 'ID', key: 'themeId', width: 120 },
  { title: '名称', key: 'name', width: 150 },
  { title: '版本', key: 'version', width: 100 },
  { title: '作者', key: 'author', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NTag, { type: row.status === 1 ? 'success' : 'default' }, () =>
        row.status === 1 ? '启用' : '禁用'
      ),
  },
  {
    title: '激活',
    key: 'isActive',
    width: 80,
    render: (row) =>
      h(NSwitch, {
        value: row.isActive === 1,
        onUpdateValue: () => handleActivate(row.themeId),
      }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          { size: 'small', type: 'primary', onClick: () => handleEditConfig(row) },
          () => '配置'
        ),
        h(
          NButton,
          { size: 'small', type: 'error', onClick: () => handleDelete(row.themeId) },
          () => '删除'
        ),
      ]),
  },
];

function getFieldComponent(type: string) {
  const components: Record<string, any> = {
    string: ThemeFieldString,
    number: ThemeFieldNumber,
    boolean: ThemeFieldBoolean,
    color: ThemeFieldColor,
    select: ThemeFieldSelect,
    textarea: ThemeFieldTextarea,
  };
  return components[type] || ThemeFieldString;
}

async function loadThemes() {
  loading.value = true;
  try {
    const res = await http.get('/admin/theme');
    themes.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleInstall() {
  await installFormRef.value?.validate();
  try {
    await http.post('/admin/theme', {
      ...installForm.value,
      configSchema: installForm.value.configSchema || {},
    });
    msg.success('主题安装成功');
    showInstallModal.value = false;
    installForm.value = {
      themeId: '',
      name: '',
      version: '1.0.0',
      description: '',
      author: '',
      configSchema: {},
    };
    loadThemes();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '安装失败');
  }
}

async function handleEditConfig(theme: any) {
  editingTheme.value = theme;
  editingConfig.value = { ...theme.config };
  showConfigModal.value = true;
}

async function handleSaveConfig() {
  try {
    await http.put(`/admin/theme/${editingTheme.value.themeId}/config`, {
      config: editingConfig.value,
    });
    msg.success('配置保存成功');
    showConfigModal.value = false;
    loadThemes();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '保存失败');
  }
}

async function handleActivate(themeId: string) {
  try {
    await http.post(`/admin/theme/${themeId}/activate`);
    msg.success('主题已激活');
    loadThemes();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '激活失败');
  }
}

async function handleDelete(themeId: string) {
  dialog.warning({
    title: '删除主题',
    content: '确定要删除此主题吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await http.delete(`/admin/theme/${themeId}`);
        msg.success('主题已删除');
        loadThemes();
      } catch (e: any) {
        msg.error(e?.response?.data?.message || '删除失败');
      }
    },
  });
}

onMounted(() => loadThemes());
</script>
