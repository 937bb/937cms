<template>
  <n-space vertical size="small" style="width: 100%">
    <n-space align="center" style="width: 100%">
      <n-input v-model:value="innerValue" :placeholder="placeholder" style="flex: 1" />
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        style="display: none"
        @change="onChooseFile"
      />
      <n-button secondary :loading="uploading" @click="openFilePicker">上传</n-button>
      <n-button tertiary :disabled="uploading" @click="clear">清空</n-button>
    </n-space>

    <div v-if="showPreview && previewUrl" class="preview">
      <img :src="previewUrl" alt="preview" />
    </div>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { uploadFile, type UploadMode } from '../../lib/upload';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    dir?: string;
    mode?: UploadMode;
    accept?: string;
    placeholder?: string;
    showPreview?: boolean;
  }>(),
  {
    modelValue: '',
    dir: 'misc',
    mode: 'image',
    accept: 'image/*',
    placeholder: '请输入图片 URL 或上传文件',
    showPreview: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const msg = useMessage();
const uploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const innerValue = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    innerValue.value = v || '';
  }
);
watch(innerValue, (v) => emit('update:modelValue', v || ''));

const previewUrl = computed(() => {
  const v = String(innerValue.value || '').trim();
  if (!v) return '';
  return v;
});

function openFilePicker() {
  fileInputRef.value?.click();
}

function clear() {
  innerValue.value = '';
}

async function onChooseFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  uploading.value = true;
  try {
    const res = await uploadFile({ file, dir: props.dir, mode: props.mode });
    if (!res?.ok || !res?.url) throw new Error('上传失败');
    innerValue.value = res.url;
    msg.success('上传成功');
  } catch (err: any) {
    msg.error(String(err?.response?.data?.message || err?.message || '上传失败'));
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.preview {
  width: 100%;
}
.preview img {
  max-width: 240px;
  max-height: 120px;
  object-fit: contain;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
}
</style>
