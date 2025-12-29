<template>
  <n-space vertical size="large">
    <n-card title="会员列表">
      <!-- 筛选栏 -->
      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.q"
          placeholder="用户名/昵称/邮箱"
          style="width: 200px"
          clearable
          @keyup.enter="load"
        />
        <n-select
          v-model:value="filters.groupId"
          :options="groupOptions"
          clearable
          placeholder="会员组"
          style="min-width: 180px"
        />
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          style="width: 120px"
        />
        <n-button type="primary" :loading="loading" @click="load">查询</n-button>
      </n-space>

      <!-- 批量操作栏 -->
      <n-space style="margin-bottom: 12px">
        <n-button :disabled="selectedIds.length === 0" @click="batchEnable">批量启用</n-button>
        <n-button :disabled="selectedIds.length === 0" @click="batchDisable">批量禁用</n-button>
        <n-popconfirm @positive-click="batchDelete">
          <template #trigger>
            <n-button type="error" :disabled="selectedIds.length === 0">批量删除</n-button>
          </template>
          确认删除选中的 {{ selectedIds.length }} 个会员？
        </n-popconfirm>
        <span v-if="selectedIds.length > 0" style="color: #999; font-size: 12px">
          已选 {{ selectedIds.length }} 项
        </span>
      </n-space>

      <!-- 数据表格 -->
      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="(row: MemberItem) => row.id"
        @update:checked-row-keys="handleCheck"
      />

      <!-- 分页 -->
      <n-space justify="end" style="margin-top: 12px">
        <n-pagination
          v-model:page="page"
          :page-size="pageSize"
          :item-count="total"
          show-size-picker
          :page-sizes="[20, 50, 100]"
          @update:page="load"
          @update:page-size="
            (s: number) => {
              pageSize = s;
              page = 1;
              load();
            }
          "
        />
      </n-space>
    </n-card>

    <!-- 编辑会员弹窗 -->
    <n-modal
      v-model:show="showEdit"
      preset="card"
      title="编辑会员"
      style="max-width: 720px; width: 100%"
    >
      <n-form :model="editForm" label-placement="left" label-width="100">
        <n-form-item label="ID">
          <n-input :value="String(editForm.id || '')" disabled />
        </n-form-item>
        <n-form-item label="用户名">
          <n-input :value="editForm.username" disabled />
        </n-form-item>
        <n-form-item label="昵称">
          <n-input v-model:value="editForm.nickname" placeholder="昵称" />
        </n-form-item>
        <n-form-item label="邮箱">
          <n-input v-model:value="editForm.email" placeholder="邮箱" />
        </n-form-item>
        <n-form-item label="头像URL">
          <n-input v-model:value="editForm.avatar" placeholder="头像URL" />
        </n-form-item>
        <n-form-item label="会员组">
          <n-select v-model:value="editForm.group_id" :options="groupOptions" />
        </n-form-item>
        <n-form-item label="积分">
          <n-input-number v-model:value="editForm.points" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="到期时间">
          <n-date-picker
            v-model:value="editForm.expire_at"
            type="datetime"
            clearable
            style="width: 100%"
          />
          <template #feedback>留空或0表示永久有效</template>
        </n-form-item>
        <n-form-item label="状态">
          <n-radio-group v-model:value="editForm.status">
            <n-radio :value="1">启用</n-radio>
            <n-radio :value="0">禁用</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showEdit = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>

    <!-- 重置密码弹窗 -->
    <n-modal
      v-model:show="showReset"
      preset="card"
      title="重置会员密码"
      style="max-width: 480px; width: 100%"
    >
      <n-form :model="resetForm" label-placement="left" label-width="80">
        <n-form-item label="会员ID">
          <n-input :value="String(resetForm.id || '')" disabled />
        </n-form-item>
        <n-form-item label="新密码">
          <n-input
            v-model:value="resetForm.password"
            type="password"
            show-password-on="click"
            placeholder="至少 6 位"
          />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showReset = false">取消</n-button>
        <n-button type="primary" :loading="savingReset" @click="resetPassword">重置</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
/**
 * 会员列表页面
 * 功能：列表、筛选、编辑、重置密码、批量操作
 */
import type { DataTableColumns, DataTableRowKey } from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

// 会员组类型
type GroupItem = { id: number; name: string };

// 会员类型
type MemberItem = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  group_id: number;
  group_name: string;
  points: number;
  points_used: number;
  expire_at: number;
  last_login_at: number;
  last_login_ip: string;
  login_count: number;
  status: number;
  created_at: number;
  updated_at: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const savingReset = ref(false);
const showEdit = ref(false);
const showReset = ref(false);

const items = ref<MemberItem[]>([]);
const groups = ref<GroupItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const selectedIds = ref<number[]>([]);

// 筛选条件
const filters = reactive<{ q: string; status: number | null; groupId: number | null }>({
  q: '',
  status: null,
  groupId: null,
});

// 状态选项
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

// 会员组选项
const groupOptions = computed(() =>
  groups.value.map((g) => ({ label: `${g.id} - ${g.name}`, value: g.id }))
);

// 编辑表单
const editForm = reactive<any>({
  id: 0,
  username: '',
  nickname: '',
  email: '',
  avatar: '',
  group_id: 1,
  points: 0,
  expire_at: null,
  status: 1,
});

// 重置密码表单
const resetForm = reactive<any>({
  id: 0,
  password: '',
});

// 加载会员组
async function loadGroups() {
  try {
    const res = await http.get('/admin/members/groups');
    groups.value = (res.data?.items || []) as GroupItem[];
  } catch {
    groups.value = [];
  }
}

// 加载会员列表
async function load() {
  loading.value = true;
  try {
    await loadGroups();
    const res = await http.get('/admin/members', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        q: filters.q || undefined,
        status: filters.status ?? undefined,
        group_id: filters.groupId ?? undefined,
      },
    });
    items.value = (res.data?.items || []) as MemberItem[];
    total.value = Number(res.data?.total || 0);
    selectedIds.value = [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

// 处理选中
function handleCheck(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[];
}

// 打开编辑弹窗
function openEdit(row: MemberItem) {
  Object.assign(editForm, {
    id: row.id,
    username: row.username,
    nickname: row.nickname || '',
    email: row.email || '',
    avatar: row.avatar || '',
    group_id: Number(row.group_id || 1),
    points: row.points || 0,
    expire_at: row.expire_at ? row.expire_at * 1000 : null,
    status: Number(row.status) ? 1 : 0,
  });
  showEdit.value = true;
}

// 保存会员
async function save() {
  if (!editForm.id) return;
  saving.value = true;
  try {
    await http.post('/admin/members/save', {
      id: editForm.id,
      nickname: editForm.nickname,
      email: editForm.email,
      avatar: editForm.avatar,
      group_id: editForm.group_id,
      points: editForm.points,
      expire_at: editForm.expire_at ? Math.floor(editForm.expire_at / 1000) : 0,
      status: editForm.status,
    });
    msg.success('保存成功');
    showEdit.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

// 打开重置密码弹窗
function openReset(id: number) {
  Object.assign(resetForm, { id, password: '' });
  showReset.value = true;
}

// 重置密码
async function resetPassword() {
  if (!resetForm.id) return;
  if (String(resetForm.password || '').trim().length < 6) {
    msg.warning('密码至少 6 位');
    return;
  }
  savingReset.value = true;
  try {
    await http.post('/admin/members/reset-password', resetForm);
    msg.success('已重置密码');
    showReset.value = false;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '重置失败'));
  } finally {
    savingReset.value = false;
  }
}

// 删除会员
async function remove(id: number) {
  try {
    await http.post('/admin/members/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

// 批量启用
async function batchEnable() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/members/batch-update-field', {
      ids: selectedIds.value,
      field: 'status',
      value: 1,
    });
    msg.success('批量启用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量禁用
async function batchDisable() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/members/batch-update-field', {
      ids: selectedIds.value,
      field: 'status',
      value: 0,
    });
    msg.success('批量禁用成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量删除
async function batchDelete() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/members/batch-delete', { ids: selectedIds.value });
    msg.success('批量删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 状态标签
function statusTag(status: number) {
  return Number(status)
    ? h(NTag, { type: 'success', size: 'small' }, { default: () => '启用' })
    : h(NTag, { type: 'default', size: 'small' }, { default: () => '禁用' });
}

// 格式化时间
function formatTime(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString('zh-CN');
}

// 表格列定义
const columns: DataTableColumns<MemberItem> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户名', key: 'username', width: 120 },
  { title: '昵称', key: 'nickname', width: 100 },
  { title: '邮箱', key: 'email', width: 180, ellipsis: { tooltip: true } },
  { title: '会员组', key: 'group_name', width: 100 },
  { title: '积分', key: 'points', width: 80 },
  {
    title: '最后登录',
    key: 'last_login_at',
    width: 160,
    render: (r) => formatTime(r.last_login_at),
  },
  { title: '状态', key: 'status', width: 80, render: (r) => statusTag(Number(r.status)) },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row) },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openReset(row.id) },
          { default: () => '重置密码' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.id) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除该会员？',
          }
        ),
      ]),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
