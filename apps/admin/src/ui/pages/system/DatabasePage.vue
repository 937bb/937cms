<template>
  <n-space vertical size="large">
    <n-card title="数据库管理">
      <n-tabs type="line">
        <!-- 表列表 -->
        <n-tab-pane name="tables" tab="数据表">
          <n-space style="margin-bottom: 12px">
            <n-button :loading="loadingTables" @click="loadTables">刷新</n-button>
            <n-button type="warning" :loading="optimizing" @click="optimizeAll"
              >优化所有表</n-button
            >
          </n-space>
          <n-data-table
            :columns="tableColumns"
            :data="tables"
            :loading="loadingTables"
            :bordered="false"
            size="small"
          />
        </n-tab-pane>

        <!-- 批量替换 -->
        <n-tab-pane name="replace" tab="批量替换">
          <n-alert type="warning" style="margin-bottom: 16px">
            批量替换会直接修改数据库数据，请谨慎操作！建议先备份数据。
          </n-alert>
          <n-form label-placement="left" label-width="100">
            <n-form-item label="选择表">
              <n-select
                v-model:value="replaceForm.table"
                :options="tableOptions"
                placeholder="选择要操作的表"
              />
            </n-form-item>
            <n-form-item label="选择字段">
              <n-select
                v-model:value="replaceForm.field"
                :options="fieldOptions"
                placeholder="选择要替换的字段"
                :disabled="!replaceForm.table"
              />
            </n-form-item>
            <n-form-item label="搜索内容">
              <n-input v-model:value="replaceForm.search" placeholder="要搜索的内容" />
            </n-form-item>
            <n-form-item label="替换为">
              <n-input v-model:value="replaceForm.replace" placeholder="替换后的内容" />
            </n-form-item>
            <n-form-item label="附加条件">
              <n-input v-model:value="replaceForm.where" placeholder="可选，如: id > 100" />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" :loading="replacing" @click="doReplace">执行替换</n-button>
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- SQL 查询 -->
        <n-tab-pane name="query" tab="SQL 查询">
          <n-alert type="info" style="margin-bottom: 16px">
            只允许执行 SELECT 查询语句，禁止执行修改数据的操作。
          </n-alert>
          <n-input
            v-model:value="querySql"
            type="textarea"
            placeholder="输入 SELECT 查询语句..."
            :rows="4"
            style="margin-bottom: 12px; font-family: monospace"
          />
          <n-space style="margin-bottom: 16px">
            <n-button type="primary" :loading="querying" @click="doQuery">执行查询</n-button>
          </n-space>
          <div v-if="queryResult">
            <n-text depth="3"
              >查询耗时: {{ queryResult.duration }}ms，返回
              {{ queryResult.rowCount }} 条记录</n-text
            >
            <n-data-table
              v-if="queryResult.rows.length"
              :columns="queryColumns"
              :data="queryResult.rows"
              :bordered="false"
              size="small"
              style="margin-top: 12px"
              max-height="400"
            />
          </div>
        </n-tab-pane>

        <!-- SQL 执行 -->
        <n-tab-pane name="execute" tab="SQL 执行">
          <n-alert type="error" style="margin-bottom: 16px">
            <template #header>危险操作</template>
            此功能可以执行任意 SQL 语句（除了 DROP DATABASE、TRUNCATE、GRANT、REVOKE），请务必谨慎！
          </n-alert>
          <n-input
            v-model:value="executeSql"
            type="textarea"
            placeholder="输入 SQL 语句..."
            :rows="4"
            style="margin-bottom: 12px; font-family: monospace"
          />
          <n-space style="margin-bottom: 16px">
            <n-popconfirm @positive-click="doExecute">
              <template #trigger>
                <n-button type="error" :loading="executing">执行 SQL</n-button>
              </template>
              确认执行此 SQL 语句？此操作不可撤销！
            </n-popconfirm>
          </n-space>
          <div v-if="executeResult">
            <n-text>执行耗时: {{ executeResult.duration }}ms</n-text><br />
            <n-text>影响行数: {{ executeResult.affectedRows }}</n-text
            ><br />
            <n-text v-if="executeResult.insertId">插入 ID: {{ executeResult.insertId }}</n-text>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { http } from '../../../lib/http';

type TableInfo = {
  name: string;
  engine: string;
  rows: number;
  dataLength: number;
  indexLength: number;
  autoIncrement: number;
  collation: string;
};

const msg = useMessage();

// 表列表
const loadingTables = ref(false);
const tables = ref<TableInfo[]>([]);
const optimizing = ref(false);

async function loadTables() {
  loadingTables.value = true;
  try {
    const res = await http.get('/admin/database/tables');
    tables.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loadingTables.value = false;
  }
}

async function optimizeAll() {
  optimizing.value = true;
  try {
    const res = await http.post('/admin/database/optimize-all');
    msg.success(res.data?.message || '优化完成');
    await loadTables();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '优化失败');
  } finally {
    optimizing.value = false;
  }
}

async function optimizeTable(name: string) {
  try {
    const res = await http.post('/admin/database/optimize', { table: name });
    msg.success(res.data?.message || '优化完成');
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '优化失败');
  }
}

async function repairTable(name: string) {
  try {
    const res = await http.post('/admin/database/repair', { table: name });
    msg.success(res.data?.message || '修复完成');
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '修复失败');
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const tableColumns: DataTableColumns<TableInfo> = [
  { title: '表名', key: 'name', width: 200 },
  { title: '引擎', key: 'engine', width: 80 },
  { title: '行数', key: 'rows', width: 100 },
  { title: '数据大小', key: 'dataLength', width: 100, render: (r) => formatSize(r.dataLength) },
  { title: '索引大小', key: 'indexLength', width: 100, render: (r) => formatSize(r.indexLength) },
  { title: '自增ID', key: 'autoIncrement', width: 100 },
  { title: '排序规则', key: 'collation', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h('div', { style: 'display:flex;gap:8px' }, [
        h(
          NButton,
          { size: 'tiny', tertiary: true, onClick: () => optimizeTable(row.name) },
          { default: () => '优化' }
        ),
        h(
          NButton,
          { size: 'tiny', tertiary: true, onClick: () => repairTable(row.name) },
          { default: () => '修复' }
        ),
      ]),
  },
];

// 批量替换
const replaceForm = reactive({ table: '', field: '', search: '', replace: '', where: '' });
const replacing = ref(false);
const fieldOptions = ref<{ label: string; value: string }[]>([]);

const tableOptions = computed(() => tables.value.map((t) => ({ label: t.name, value: t.name })));

watch(
  () => replaceForm.table,
  async (table) => {
    if (!table) {
      fieldOptions.value = [];
      return;
    }
    try {
      const res = await http.get('/admin/database/describe', { params: { table } });
      fieldOptions.value = (res.data?.columns || []).map((c: any) => ({
        label: c.Field,
        value: c.Field,
      }));
    } catch {
      fieldOptions.value = [];
    }
  }
);

async function doReplace() {
  if (!replaceForm.table || !replaceForm.field || !replaceForm.search) {
    msg.warning('请填写完整信息');
    return;
  }
  replacing.value = true;
  try {
    const res = await http.post('/admin/database/replace', replaceForm);
    msg.success(res.data?.message || '替换完成');
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '替换失败');
  } finally {
    replacing.value = false;
  }
}

// SQL 查询
const querySql = ref('');
const querying = ref(false);
const queryResult = ref<{ rows: any[]; rowCount: number; duration: number } | null>(null);

const queryColumns = computed<DataTableColumns<any>>(() => {
  if (!queryResult.value?.rows?.length) return [];
  const keys = Object.keys(queryResult.value.rows[0]);
  return keys.map((k) => ({ title: k, key: k, ellipsis: { tooltip: true } }));
});

async function doQuery() {
  if (!querySql.value.trim()) {
    msg.warning('请输入 SQL');
    return;
  }
  querying.value = true;
  queryResult.value = null;
  try {
    const res = await http.post('/admin/database/query', { sql: querySql.value });
    queryResult.value = res.data;
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '查询失败');
  } finally {
    querying.value = false;
  }
}

// SQL 执行
const executeSql = ref('');
const executing = ref(false);
const executeResult = ref<{
  affectedRows: number;
  changedRows: number;
  insertId: number;
  duration: number;
} | null>(null);

async function doExecute() {
  if (!executeSql.value.trim()) {
    msg.warning('请输入 SQL');
    return;
  }
  executing.value = true;
  executeResult.value = null;
  try {
    const res = await http.post('/admin/database/execute', {
      sql: executeSql.value,
      confirmed: true,
    });
    executeResult.value = res.data;
    msg.success('执行成功');
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '执行失败');
  } finally {
    executing.value = false;
  }
}

onMounted(() => {
  loadTables();
});
</script>
