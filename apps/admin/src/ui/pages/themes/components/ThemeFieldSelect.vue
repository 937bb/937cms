<template>
  <n-select v-model:value="modelValue" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NSelect } from 'naive-ui';

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

const options = computed(() =>
  (props.field.options || []).map((opt: any) => ({
    label: opt.label,
    value: opt.value,
  }))
);
</script>
