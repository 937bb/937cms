<template>
  <n-space vertical size="large">
    <n-card title="系统信息">
      <n-descriptions :column="2" label-placement="left" bordered>
        <n-descriptions-item label="系统版本">
          <n-tag type="info">{{ sysInfo.version || '-' }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="数据库版本">
          <n-tag type="success">{{ sysInfo.dbVersion || '-' }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Node 版本">{{
          sysInfo.nodeVersion || '-'
        }}</n-descriptions-item>
        <n-descriptions-item label="运行平台">{{ sysInfo.platform || '-' }}</n-descriptions-item>
      </n-descriptions>

      <n-divider>数据库迁移历史</n-divider>
      <n-data-table
        :columns="migrationColumns"
        :data="sysInfo.migrations || []"
        :bordered="false"
        size="small"
        :max-height="200"
      />

      <n-space justify="end" style="margin-top: 16px">
        <n-button secondary :loading="infoLoading" @click="loadInfo">刷新</n-button>
        <n-button type="warning" :loading="upgrading" @click="runUpgrade">
          检查并升级数据库
        </n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage, type DataTableColumns } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

const msg = useMessage();
const infoLoading = ref(false);
const upgrading = ref(false);

const sysInfo = reactive({
  version: '',
  dbVersion: '',
  nodeVersion: '',
  platform: '',
  migrations: [] as { version: string; name: string; executed_at: number }[],
});

const migrationColumns: DataTableColumns<{ version: string; name: string; executed_at: number }> = [
  { title: '版本', key: 'version', width: 80 },
  { title: '名称', key: 'name' },
  {
    title: '执行时间',
    key: 'executed_at',
    width: 180,
    render: (row) => {
      if (!row.executed_at) return '-';
      const d = new Date(row.executed_at * 1000);
      return d.toLocaleString('zh-CN');
    },
  },
];

async function loadInfo() {
  infoLoading.value = true;
  try {
    const res = await http.get('/admin/system-settings/info');
    sysInfo.version = res.data?.version || '';
    sysInfo.dbVersion = res.data?.dbVersion || '';
    sysInfo.nodeVersion = res.data?.nodeVersion || '';
    sysInfo.platform = res.data?.platform || '';
    sysInfo.migrations = res.data?.migrations || [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载系统信息失败'));
  } finally {
    infoLoading.value = false;
  }
}

async function runUpgrade() {
  upgrading.value = true;
  try {
    const res = await http.post('/admin/system-settings/upgrade');
    if (res.data?.executed > 0) {
      msg.success(res.data?.message || '升级成功');
      await loadInfo();
    } else {
      msg.info(res.data?.message || '数据库已是最新版本');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '升级失败'));
  } finally {
    upgrading.value = false;
  }
}

onMounted(() => {
  loadInfo().catch(() => void 0);
});
</script>
