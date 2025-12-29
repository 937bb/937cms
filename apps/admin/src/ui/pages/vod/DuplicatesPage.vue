<template>
  <n-space vertical size="large">
    <n-card title="重名视频">
      <template #header-extra>
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
      </template>

      <n-alert v-if="items.length === 0 && !loading" type="success" style="margin-bottom: 16px">
        没有发现重名视频
      </n-alert>

      <n-data-table
        v-if="items.length > 0"
        :columns="columns"
        :data="tableData"
        :bordered="false"
        :loading="loading"
        :row-key="(row: TableRow) => row.key"
        :row-class-name="rowClassName"
      />

      <n-pagination
        v-if="total > pageSize"
        v-model:page="page"
        :page-size="pageSize"
        :item-count="total"
        style="margin-top: 16px; justify-content: flex-end"
        @update:page="load"
      />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NSpace, NTag, useMessage } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { http } from '../../../lib/http';

type VideoItem = {
  vod_id: number;
  vod_name: string;
  type_id: number;
  vod_time: number;
  vod_status: number;
};
type DuplicateItem = { name: string; count: number; videos: VideoItem[] };
type TableRow = {
  key: string;
  isGroup: boolean;
  name: string;
  count?: number;
  vod_id?: number;
  type_id?: number;
  vod_time?: number;
  vod_status?: number;
  videos?: VideoItem[];
};

const msg = useMessage();
const loading = ref(false);
const items = ref<DuplicateItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

// 将数据转换为扁平表格格式
const tableData = computed<TableRow[]>(() => {
  const rows: TableRow[] = [];
  for (const item of items.value) {
    // 添加分组行
    rows.push({
      key: `group-${item.name}`,
      isGroup: true,
      name: item.name,
      count: item.count,
      videos: item.videos,
    });
    // 添加视频行
    for (const v of item.videos) {
      rows.push({
        key: `video-${v.vod_id}`,
        isGroup: false,
        name: item.name,
        vod_id: v.vod_id,
        type_id: v.type_id,
        vod_time: v.vod_time,
        vod_status: v.vod_status,
      });
    }
  }
  return rows;
});

function rowClassName(row: TableRow) {
  return row.isGroup ? 'duplicate-group-row' : '';
}

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/vods/duplicates', {
      params: { page: page.value, pageSize: pageSize.value },
    });
    items.value = res.data?.items || [];
    total.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function deleteVideos(ids: number[]) {
  try {
    await http.post('/admin/vods/batch-delete', { ids });
    msg.success('删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

function keepFirst(videos: VideoItem[]) {
  const ids = videos.slice(1).map((v) => v.vod_id);
  if (ids.length > 0) deleteVideos(ids);
}

function keepLast(videos: VideoItem[]) {
  const ids = videos.slice(0, -1).map((v) => v.vod_id);
  if (ids.length > 0) deleteVideos(ids);
}

function formatTime(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString('zh-CN');
}

const columns: DataTableColumns<TableRow> = [
  {
    title: '视频名称',
    key: 'name',
    minWidth: 200,
    render: (row) => {
      if (row.isGroup) {
        return h('strong', { style: 'font-size: 14px' }, row.name);
      }
      return h('span', { style: 'padding-left: 20px; color: #666' }, `└ ID: ${row.vod_id}`);
    },
  },
  {
    title: '数量/分类',
    key: 'count',
    width: 100,
    render: (row) =>
      row.isGroup
        ? h(NTag, { type: 'warning' }, { default: () => `${row.count}个` })
        : `分类: ${row.type_id}`,
  },
  {
    title: '更新时间',
    key: 'vod_time',
    width: 180,
    render: (row) => (row.isGroup ? '' : formatTime(row.vod_time || 0)),
  },
  {
    title: '状态',
    key: 'vod_status',
    width: 80,
    render: (row) => {
      if (row.isGroup) return '';
      return Number(row.vod_status)
        ? h(NTag, { type: 'success', size: 'small' }, { default: () => '上架' })
        : h(NTag, { type: 'default', size: 'small' }, { default: () => '下架' });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) => {
      if (row.isGroup) {
        return h(
          NSpace,
          { size: 'small' },
          {
            default: () => [
              h(
                NPopconfirm,
                { onPositiveClick: () => keepFirst(row.videos!) },
                {
                  trigger: () =>
                    h(NButton, { size: 'small', type: 'warning' }, { default: () => '保留第一个' }),
                  default: () => `删除其他 ${(row.count || 0) - 1} 个？`,
                }
              ),
              h(
                NPopconfirm,
                { onPositiveClick: () => keepLast(row.videos!) },
                {
                  trigger: () =>
                    h(
                      NButton,
                      { size: 'small', type: 'warning' },
                      { default: () => '保留最后一个' }
                    ),
                  default: () => `删除其他 ${(row.count || 0) - 1} 个？`,
                }
              ),
            ],
          }
        );
      }
      return h(
        NPopconfirm,
        { onPositiveClick: () => deleteVideos([row.vod_id!]) },
        {
          trigger: () =>
            h(NButton, { size: 'small', tertiary: true, type: 'error' }, { default: () => '删除' }),
          default: () => '确认删除？',
        }
      );
    },
  },
];

onMounted(() => {
  load();
});
</script>

<style>
.duplicate-group-row td {
  background-color: #f5f5f5 !important;
}
</style>
