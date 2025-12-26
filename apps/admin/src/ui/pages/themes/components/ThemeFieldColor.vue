<template>
  <n-color-picker v-model:value="modelValue" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NColorPicker } from 'naive-ui';

const props = defineProps<{
  modelValue: string;
  field: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
