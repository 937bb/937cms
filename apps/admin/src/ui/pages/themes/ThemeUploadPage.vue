<template>
  <n-space vertical size="large">
    <n-card title="主题管理">
      <template #header-extra>
        <n-upload
          :action="`${apiBaseUrl}/admin/theme/upload`"
          :headers="{ Authorization: `Bearer ${token}` }"
          accept=".zip"
          :show-file-list="false"
          @finish="handleUploadFinish"
        >
          <n-button type="primary">上传主题</n-button>
        </n-upload>
      </template>
      <n-list>
        <n-list-item v-for="theme in themes" :key="theme.themeId">
          <template #header> {{ theme.name }} (v{{ theme.version }}) </template>
          <template #default>
            {{ theme.description }}
          </template>
          <template #suffix>
            <n-space>
              <n-switch
                :value="theme.isActive === 1"
                @update:value="() => handleActivate(theme.themeId)"
              />
              <n-button size="small" @click="() => handleConfig(theme)"> 配置 </n-button>
              <n-button size="small" @click="() => handleConfigNewWindow(theme)"> 在新窗口打开 </n-button>
              <n-button text type="error" size="small" @click="() => handleDelete(theme.themeId)">
                删除
              </n-button>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
    </n-card>

    <!-- 配置编辑模态框 -->
    <n-modal
      v-model:show="showConfigModal"
      :title="`配置 ${editingTheme?.name}`"
      preset="card"
      style="width: 600px"
    >
      <n-form v-if="editingTheme">
        <n-form-item
          v-for="(field, key) in editingTheme.configSchema"
          :key="key"
          :label="field.label"
        >
          <n-input
            v-if="field.type === 'string'"
            v-model:value="editingConfig[key]"
            :placeholder="field.description"
          />
          <n-input-number
            v-else-if="field.type === 'number'"
            v-model:value="editingConfig[key]"
            style="width: 100%"
          />
          <n-switch v-else-if="field.type === 'boolean'" v-model:value="editingConfig[key]" />
          <n-color-picker v-else-if="field.type === 'color'" v-model:value="editingConfig[key]" />
          <n-select
            v-else-if="field.type === 'select'"
            v-model:value="editingConfig[key]"
            :options="field.options"
          />
          <n-input
            v-else-if="field.type === 'textarea'"
            v-model:value="editingConfig[key]"
            type="textarea"
            :placeholder="field.description"
          />
          <n-input v-else v-model:value="editingConfig[key]" :placeholder="field.description" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showConfigModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- iframe 配置模态框 -->
    <n-modal
      v-model:show="showIframeModal"
      preset="card"
      title="主题配置"
      style="width: 100%; height: 100%; max-width: 100vw; max-height: 100vh; margin: 0"
      :segmented="{ content: true }"
    >
      <iframe
        v-if="showIframeModal"
        :src="iframeUrl"
        style="width: 100%; height: calc(100vh - 120px); border: none"
      />
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NSpace,
  NButton,
  NList,
  NListItem,
  NSwitch,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NColorPicker,
  NSelect,
  NUpload,
  useMessage,
  useDialog,
} from 'naive-ui';
import { http, getToken } from '../../../lib/http';

const msg = useMessage();
const dialog = useDialog();
const router = useRouter();
const themes = ref<any[]>([]);
const showConfigModal = ref(false);
const editingTheme = ref<any>(null);
const editingConfig = ref<Record<string, any>>({});
const showIframeModal = ref(false);
const iframeUrl = ref('');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const token = getToken();

async function loadThemes() {
  try {
    const res = await http.get('/admin/theme');
    themes.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  }
}

function handleUploadFinish({ event }: any) {
  const response = event?.target?.response;
  if (response) {
    try {
      const data = JSON.parse(response);
      if (data.ok) {
        msg.success('主题上传成功');
        loadThemes();
      } else {
        msg.error(data.message || '上传失败');
      }
    } catch {
      msg.error('上传失败');
    }
  }
}

async function handleConfig(theme: any) {
  const configUrl = `${apiBaseUrl}/admin/theme/${theme.themeId}/config-page`;
  iframeUrl.value = `${configUrl}?token=${token}&_t=${Date.now()}`;
  showIframeModal.value = true;
}

function handleConfigNewWindow(theme: any) {
  const configUrl = `${apiBaseUrl}/admin/theme/${theme.themeId}/config-page`;
  window.open(`${configUrl}?token=${token}&_t=${Date.now()}`, '_blank');
}

async function handleSaveConfig() {
  try {
    await http.post(`/admin/theme/${editingTheme.value.themeId}/config`, {
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
        await http.post(`/admin/theme/${themeId}/delete`);
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
