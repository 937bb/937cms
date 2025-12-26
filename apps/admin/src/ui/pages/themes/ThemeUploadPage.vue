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
              <n-button text type="error" size="small" @click="() => handleDelete(theme.themeId)">
                删除
              </n-button>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NCard, NSpace, NUpload, NButton, NText, NList, NListItem, NSwitch, useMessage, useDialog } from 'naive-ui';
import { http } from '../../../lib/http';
import { useAuthStore } from '../../../stores/auth';

const msg = useMessage();
const dialog = useDialog();
const auth = useAuthStore();
const token = ref(auth.token);
const themes = ref<any[]>([]);

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
