<template>
  <n-switch v-model:value="modelValue" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NSwitch } from 'naive-ui';

const props = defineProps<{
  modelValue: boolean;
  field: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
