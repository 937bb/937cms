<template>
  <n-space vertical size="large">
    <n-card title="上传主题配置">
      <n-space vertical>
        <n-upload
          action="/admin/theme/upload"
          :headers="{ Authorization: `Bearer ${token}` }"
          @finish="handleUploadFinish"
          @error="handleUploadError"
        >
          <n-button>选择配置文件 (JSON)</n-button>
        </n-upload>
        <n-text depth="3">支持上传 theme.config.json 文件</n-text>
      </n-space>
    </n-card>

    <n-card title="已安装的主题" v-if="themes.length > 0">
      <n-list>
        <n-list-item v-for="theme in themes" :key="theme.themeId">
          <template #header>
            {{ theme.name }} (v{{ theme.version }})
          </template>
          <template #default>
            {{ theme.description }}
          </template>
          <template #suffix>
            <n-space>
              <n-switch
                :value="theme.isActive === 1"
                @update:value="() => handleActivate(theme.themeId)"
              />
              <n-button size="small" @click="() => handleConfig(theme)">
                配置
              </n-button>
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
          <n-switch
            v-else-if="field.type === 'boolean'"
            v-model:value="editingConfig[key]"
          />
          <n-color-picker
            v-else-if="field.type === 'color'"
            v-model:value="editingConfig[key]"
          />
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
          <n-input
            v-else
            v-model:value="editingConfig[key]"
            :placeholder="field.description"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showConfigModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveConfig">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  NCard,
  NSpace,
  NUpload,
  NButton,
  NText,
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
  useMessage,
  useDialog,
} from 'naive-ui';
import { http } from '../../../lib/http';
import { useAuthStore } from '../../../stores/auth';

const msg = useMessage();
const dialog = useDialog();
const auth = useAuthStore();
const token = ref(auth.token);
const themes = ref<any[]>([]);
const showConfigModal = ref(false);
const editingTheme = ref<any>(null);
const editingConfig = ref<Record<string, any>>({});

async function loadThemes() {
  try {
    const res = await http.get('/admin/theme');
    themes.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  }
}

function handleUploadFinish({ file }: any) {
  msg.success('主题上传成功');
  loadThemes();
}

function handleUploadError() {
  msg.error('上传失败');
}

async function handleConfig(theme: any) {
  try {
    const res = await http.get(`/admin/theme/${theme.themeId}`);
    editingTheme.value = res.data;
    editingConfig.value = { ...res.data.config };
    showConfigModal.value = true;
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载配置失败');
  }
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
