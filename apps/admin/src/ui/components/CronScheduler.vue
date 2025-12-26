<template>
  <n-space vertical size="small">
    <n-space align="center">
      <span style="min-width: 100px">执行周期</span>
      <n-select v-model:value="period" :options="periodOptions" style="width: 200px" />
    </n-space>

    <n-space align="center" v-if="period === 'hourly'">
      <span style="min-width: 100px">执行分钟</span>
      <n-input-number v-model:value="minuteValue" :min="0" :max="59" style="width: 150px" />
    </n-space>

    <n-space align="center" v-if="period !== 'never' && period !== 'hourly'">
      <span style="min-width: 100px">执行时间</span>
      <n-time-picker v-model:value="timeValue" format="HH:mm" style="width: 200px" />
    </n-space>

    <n-space align="center" v-if="period === 'custom'">
      <span style="min-width: 100px">Cron 表达式</span>
      <n-input v-model:value="customCron" placeholder="例如: 0 14 * * 1-5" style="width: 350px" />
    </n-space>

    <n-alert v-if="cronExpression" type="info" style="margin-top: 8px">
      <div>
        Cron 表达式: <code>{{ cronExpression }}</code>
      </div>
      <div v-if="nextRun">下次执行: {{ nextRun }}</div>
    </n-alert>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NAlert, NInput, NInputNumber, NSelect, NSpace, NTimePicker } from 'naive-ui';
import { CronParser } from '../../lib/cron-parser';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const periodOptions = [
  { label: '不定时', value: 'never' },
  { label: '每小时', value: 'hourly' },
  { label: '每天', value: 'daily' },
  { label: '每周一', value: 'monday' },
  { label: '每周二', value: 'tuesday' },
  { label: '每周三', value: 'wednesday' },
  { label: '每周四', value: 'thursday' },
  { label: '每周五', value: 'friday' },
  { label: '每周六', value: 'saturday' },
  { label: '每周日', value: 'sunday' },
  { label: '自定义', value: 'custom' },
];

const period = ref<string>('never');
const timeValue = ref<number | null>(null);
const minuteValue = ref<number>(0);
const customCron = ref('');

const cronExpression = computed(() => {
  if (period.value === 'never') return '';

  if (period.value === 'hourly') {
    const minute = minuteValue.value ?? 0;
    return `${minute} * * * *`;
  }

  const hour = timeValue.value ? Math.floor(timeValue.value / 3600000) : 0;
  const minute = timeValue.value ? Math.floor((timeValue.value % 3600000) / 60000) : 0;

  if (period.value === 'custom') {
    return customCron.value;
  }

  const weekdayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  if (period.value === 'daily') {
    return `${minute} ${hour} * * *`;
  }

  const weekday = weekdayMap[period.value];
  return `${minute} ${hour} * * ${weekday}`;
});

const nextRun = computed(() => {
  if (!cronExpression.value) return '';
  try {
    const next = CronParser.nextRunTime(cronExpression.value);
    if (!next) return '';
    return next.toLocaleString();
  } catch {
    return '';
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      period.value = 'never';
      timeValue.value = null;
      minuteValue.value = 0;
      customCron.value = '';
      return;
    }

    try {
      const parts = CronParser.parse(newVal);
      const minute = parts.minute[0] || 0;
      const hour = parts.hour[0] || 0;

      // 检查是否为每小时 (小时为 *, 天为 *, 月份为 *, 工作日为 *)
      if (
        parts.hour.length === 24 &&
        parts.day.length === 31 &&
        parts.month.length === 12 &&
        parts.weekday.length === 7
      ) {
        period.value = 'hourly';
        minuteValue.value = minute;
      } else {
        timeValue.value = hour * 3600000 + minute * 60000;

        if (newVal.includes('*') && newVal.split(' ')[4] === '*') {
          period.value = 'daily';
        } else if (parts.weekday.length === 1) {
          const weekdayMap: Record<number, string> = {
            0: 'sunday',
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
          };
          period.value = weekdayMap[parts.weekday[0]] || 'custom';
        } else {
          period.value = 'custom';
          customCron.value = newVal;
        }
      }
    } catch {
      period.value = 'custom';
      customCron.value = newVal;
    }
  },
  { immediate: true }
);

watch(cronExpression, (newVal) => {
  emit('update:modelValue', newVal);
});
</script>
