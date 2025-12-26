<template>
  <n-space vertical size="large">
    <n-card title="批量操作视频">
      <n-alert type="info" style="margin-bottom: 16px">
        选择筛选条件后，可对符合条件的视频进行批量操作。
      </n-alert>

      <n-form label-placement="left" label-width="100">
        <n-grid :cols="3" :x-gap="16" :y-gap="12">
          <n-gi>
            <n-form-item label="分类">
              <n-tree-select
                v-model:value="filters.typeId"
                :options="typeTreeOptions"
                clearable
                placeholder="选择分类"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="状态">
              <n-select
                v-model:value="filters.status"
                :options="statusOptions"
                clearable
                placeholder="选择状态"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="锁定">
              <n-select
                v-model:value="filters.lock"
                :options="lockOptions"
                clearable
                placeholder="选择锁定状态"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="推荐等级">
              <n-select
                v-model:value="filters.level"
                :options="levelOptions"
                clearable
                placeholder="选择等级"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="完结状态">
              <n-select
                v-model:value="filters.isend"
                :options="isendOptions"
                clearable
                placeholder="选择完结状态"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="播放地址">
              <n-select
                v-model:value="filters.url"
                :options="urlOptions"
                clearable
                placeholder="选择地址状态"
              />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-space style="margin-top: 16px">
          <n-button type="primary" :loading="counting" @click="countVideos">统计数量</n-button>
        </n-space>
      </n-form>

      <n-divider />

      <n-statistic
        v-if="matchCount !== null"
        label="符合条件的视频数量"
        :value="matchCount"
        style="margin-bottom: 16px"
      />

      <n-form v-if="matchCount !== null && matchCount > 0" label-placement="left" label-width="100">
        <n-form-item label="操作类型">
          <n-select
            v-model:value="action"
            :options="actionOptions"
            placeholder="选择操作"
            style="width: 200px"
          />
        </n-form-item>

        <n-form-item v-if="action === 'status'" label="设置状态">
          <n-radio-group v-model:value="actionValue">
            <n-radio :value="1">上架</n-radio>
            <n-radio :value="0">下架</n-radio>
          </n-radio-group>
        </n-form-item>

        <n-form-item v-if="action === 'lock'" label="设置锁定">
          <n-radio-group v-model:value="actionValue">
            <n-radio :value="1">锁定</n-radio>
            <n-radio :value="0">解锁</n-radio>
          </n-radio-group>
        </n-form-item>

        <n-form-item v-if="action === 'level'" label="设置等级">
          <n-select v-model:value="actionValue" :options="levelOptions" style="width: 120px" />
        </n-form-item>

        <n-form-item v-if="action === 'type'" label="设置分类">
          <n-tree-select
            v-model:value="actionValue"
            :options="typeTreeOptions"
            placeholder="选择分类"
            style="width: 260px"
          />
        </n-form-item>

        <n-form-item v-if="action === 'hits'" label="随机点击数">
          <n-input-number
            v-model:value="hitsStart"
            :min="0"
            placeholder="最小值"
            style="width: 120px"
          />
          <span style="margin: 0 8px">~</span>
          <n-input-number
            v-model:value="hitsEnd"
            :min="0"
            placeholder="最大值"
            style="width: 120px"
          />
        </n-form-item>

        <n-form-item v-if="action === 'delete'" label="确认删除">
          <n-alert type="error"
            >此操作将永久删除符合条件的 {{ matchCount }} 个视频，不可恢复！</n-alert
          >
        </n-form-item>

        <n-space style="margin-top: 16px">
          <n-popconfirm @positive-click="executeBatch">
            <template #trigger>
              <n-button type="warning" :loading="executing" :disabled="!action"
                >执行批量操作</n-button
              >
            </template>
            确认对 {{ matchCount }} 个视频执行此操作？
          </n-popconfirm>
        </n-space>
      </n-form>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { TreeSelectOption } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type TypeItem = { type_id: number; type_name: string; type_pid: number; type_sort: number };

const msg = useMessage();
const counting = ref(false);
const executing = ref(false);
const matchCount = ref<number | null>(null);
const types = ref<TypeItem[]>([]);

const filters = reactive({
  typeId: null as number | null,
  status: null as number | null,
  lock: null as number | null,
  level: null as number | null,
  isend: null as number | null,
  url: '' as string,
});

const action = ref<string>('');
const actionValue = ref<number | null>(null);
const hitsStart = ref<number>(100);
const hitsEnd = ref<number>(1000);

const statusOptions = [
  { label: '上架', value: 1 },
  { label: '下架', value: 0 },
];
const lockOptions = [
  { label: '已锁定', value: 1 },
  { label: '未锁定', value: 0 },
];
const isendOptions = [
  { label: '完结', value: 1 },
  { label: '连载', value: 0 },
];
const urlOptions = [
  { label: '无地址', value: '0' },
  { label: '有地址', value: '1' },
];
const levelOptions = Array.from({ length: 10 }, (_, i) => ({ label: `等级 ${i}`, value: i }));
const actionOptions = [
  { label: '修改状态', value: 'status' },
  { label: '修改锁定', value: 'lock' },
  { label: '修改等级', value: 'level' },
  { label: '修改分类', value: 'type' },
  { label: '随机点击数', value: 'hits' },
  { label: '批量删除', value: 'delete' },
];

function buildTypeTreeOptions(list: TypeItem[]): TreeSelectOption[] {
  const byPid = new Map<number, TypeItem[]>();
  for (const t of list)
    byPid.set(Number(t.type_pid || 0), [...(byPid.get(Number(t.type_pid || 0)) || []), t]);
  const walk = (pid: number): TreeSelectOption[] => {
    const children = (byPid.get(pid) || []).sort(
      (a, b) => Number(a.type_sort || 0) - Number(b.type_sort || 0)
    );
    return children.map((c) => ({ label: c.type_name, key: c.type_id, children: walk(c.type_id) }));
  };
  return walk(0);
}

const typeTreeOptions = computed(() => buildTypeTreeOptions(types.value));

async function loadTypes() {
  const res = await http.get('/admin/types');
  types.value = (res.data?.items || []) as TypeItem[];
}

async function countVideos() {
  counting.value = true;
  matchCount.value = null;
  try {
    const res = await http.get('/admin/vods', {
      params: {
        page: 1,
        pageSize: 1,
        typeId: filters.typeId ?? undefined,
        status: filters.status ?? undefined,
        lock: filters.lock ?? undefined,
        level: filters.level ?? undefined,
        isend: filters.isend ?? undefined,
        url: filters.url || undefined,
      },
    });
    matchCount.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '统计失败'));
  } finally {
    counting.value = false;
  }
}

async function executeBatch() {
  if (!action.value) return;
  if (matchCount.value === null || matchCount.value === 0) return;

  executing.value = true;
  try {
    const res = await http.post('/admin/vods/batch-by-filter', {
      filters: {
        typeId: filters.typeId ?? undefined,
        status: filters.status ?? undefined,
        lock: filters.lock ?? undefined,
        level: filters.level ?? undefined,
        isend: filters.isend ?? undefined,
        url: filters.url || undefined,
      },
      action: action.value,
      value: action.value === 'hits' ? undefined : actionValue.value,
      start: action.value === 'hits' ? hitsStart.value : undefined,
      end: action.value === 'hits' ? hitsEnd.value : undefined,
    });
    msg.success(`操作成功，影响 ${res.data?.updated || 0} 条记录`);
    matchCount.value = null;
    action.value = '';
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  } finally {
    executing.value = false;
  }
}

onMounted(() => {
  loadTypes();
});
</script>
