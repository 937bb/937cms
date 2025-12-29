<template>
  <n-input-number v-model:value="modelValue" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NInputNumber } from 'naive-ui';

const props = defineProps<{
  modelValue: number;
  field: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
