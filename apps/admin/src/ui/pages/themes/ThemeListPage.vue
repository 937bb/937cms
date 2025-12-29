<template>
  <n-space vertical size="large">
    <n-card title="模板管理">
      <template #header-extra>
        <n-text depth="3">模板开发者可在 themes/ 目录下创建配置页面</n-text>
      </template>

      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :row-key="(row: any) => row.id"
      />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { NButton, NSpace, NSwitch, NTag, useMessage } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useRouter } from 'vue-router';
import { http } from '../../../lib/http';

const msg = useMessage();
const router = useRouter();
const loading = ref(false);
const list = ref<any[]>([]);

const columns: DataTableColumns<any> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '模板名称', key: 'theme_name', width: 150 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NSwitch, {
        value: row.status === 1,
        onUpdateValue: (v: boolean) => updateStatus(row.theme_name, v ? 1 : 0),
      }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h(NSpace, {}, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => router.push(`/themes/${row.theme_name}`),
          },
          () => '配置'
        ),
      ]),
  },
];

async function loadList() {
  loading.value = true;
  try {
    const res = await http.get('/admin/theme/list');
    list.value = res.data || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function updateStatus(name: string, status: number) {
  try {
    await http.post('/admin/theme/status', { name, status });
    loadList();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '更新失败');
  }
}

onMounted(() => loadList());
</script>
