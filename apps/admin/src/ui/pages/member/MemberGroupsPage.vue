<template>
  <n-space vertical size="large">
    <n-card title="会员组管理">
      <!-- 操作栏 -->
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-space>
          <n-button type="primary" @click="openCreate">新增会员组</n-button>
          <n-button secondary :loading="loading" @click="load">刷新</n-button>
        </n-space>
        <n-space>
          <n-button :disabled="selectedIds.length === 0" @click="batchEnable">批量启用</n-button>
          <n-button :disabled="selectedIds.length === 0" @click="batchDisable">批量禁用</n-button>
        </n-space>
      </n-space>

      <!-- 数据表格 -->
      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="(row: GroupItem) => row.id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <!-- 编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="form.id ? '编辑会员组' : '新增会员组'"
      style="max-width: 720px; width: 100%"
    >
      <n-form :model="form" label-placement="left" label-width="120">
        <n-form-item label="名称" required>
          <n-input v-model:value="form.name" placeholder="会员组名称" />
        </n-form-item>
        <n-form-item label="等级">
          <n-input-number v-model:value="form.level" :min="0" :max="100" style="width: 100%" />
          <template #feedback>数值越大等级越高</template>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="form.remark" placeholder="备注信息" />
        </n-form-item>
        <n-divider>积分限制</n-divider>
        <n-form-item label="每日积分上限">
          <n-input-number v-model:value="form.points_day" :min="0" style="width: 100%" />
          <template #feedback>0表示不限制</template>
        </n-form-item>
        <n-form-item label="每周积分上限">
          <n-input-number v-model:value="form.points_week" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="每月积分上限">
          <n-input-number v-model:value="form.points_month" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="免积分">
          <n-switch v-model:value="form.points_free" />
          <span style="margin-left: 8px">{{
            form.points_free ? '是（观看不消耗积分）' : '否'
          }}</span>
        </n-form-item>
        <n-divider />
        <n-form-item label="状态">
          <n-switch v-model:value="form.status" />
          <span style="margin-left: 8px">{{ form.status ? '启用' : '禁用' }}</span>
        </n-form-item>
      </n-form>

      <n-space justify="end">
        <n-button secondary @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-modal>

    <!-- 权限设置弹窗 -->
    <n-modal
      v-model:show="showPermModal"
      preset="card"
      title="权限设置"
      style="max-width: 900px; width: 100%"
    >
      <n-alert type="info" style="margin-bottom: 16px">
        <template #header>提示</template>
        <p>
          1. 列表页、内容页、播放页、下载页
          4个权限，控制是否可以进入页面，没权限会直接返回提示信息。
        </p>
        <p>
          2.
          试看权限：如果没有访问播放页的权限、或者有权限但是需要积分购买的数据，开启了试看权限也是可以进入页面的。
        </p>
      </n-alert>
      <div v-if="permGroup">
        <div style="margin-bottom: 12px"><strong>名称：</strong>{{ permGroup.name }}</div>
        <n-table :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th style="width: 100px">分类</th>
              <th style="width: 80px">列表页</th>
              <th style="width: 80px">内容页</th>
              <th style="width: 80px">播放页</th>
              <th style="width: 80px">下载页</th>
              <th style="width: 80px">试看</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.type_id">
              <td>
                <n-checkbox v-model:checked="permData[cat.type_id].enabled">{{
                  cat.type_name
                }}</n-checkbox>
              </td>
              <td>
                <n-checkbox
                  v-model:checked="permData[cat.type_id].list"
                  :disabled="!permData[cat.type_id].enabled"
                />
              </td>
              <td>
                <n-checkbox
                  v-model:checked="permData[cat.type_id].detail"
                  :disabled="!permData[cat.type_id].enabled"
                />
              </td>
              <td>
                <n-checkbox
                  v-model:checked="permData[cat.type_id].play"
                  :disabled="!permData[cat.type_id].enabled"
                />
              </td>
              <td>
                <n-checkbox
                  v-model:checked="permData[cat.type_id].down"
                  :disabled="!permData[cat.type_id].enabled"
                />
              </td>
              <td>
                <n-checkbox
                  v-model:checked="permData[cat.type_id].trysee"
                  :disabled="!permData[cat.type_id].enabled"
                />
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-space style="margin-top: 16px">
          <n-button @click="selectAllPerm">全选</n-button>
          <n-button @click="invertPerm">反选</n-button>
        </n-space>
      </div>
      <n-space justify="end" style="margin-top: 16px">
        <n-button secondary @click="showPermModal = false">取消</n-button>
        <n-button type="primary" :loading="savingPerm" @click="savePerm">保存</n-button>
      </n-space>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
/**
 * 会员组管理页面
 * 功能：列表、新增、编辑、删除、批量操作、权限设置
 */
import type { DataTableColumns, DataTableRowKey } from 'naive-ui';
import { NAlert, NButton, NCheckbox, NPopconfirm, NTable, NTag, useMessage } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

// 会员组类型
type GroupItem = {
  id: number;
  name: string;
  remark: string;
  level: number;
  status: number;
  member_count: number;
  points_day: number;
  points_week: number;
  points_month: number;
  points_free: number;
  popedom: string;
  updated_at: number;
};

type CategoryItem = { type_id: number; type_name: string };
type PermItem = {
  enabled: boolean;
  list: boolean;
  detail: boolean;
  play: boolean;
  down: boolean;
  trysee: boolean;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const items = ref<GroupItem[]>([]);
const selectedIds = ref<number[]>([]);

// 权限相关
const showPermModal = ref(false);
const savingPerm = ref(false);
const permGroup = ref<GroupItem | null>(null);
const categories = ref<CategoryItem[]>([]);
const permData = reactive<Record<number, PermItem>>({});

// 表单数据
const form = reactive<any>({
  id: 0,
  name: '',
  remark: '',
  level: 0,
  status: true,
  points_day: 0,
  points_week: 0,
  points_month: 0,
  points_free: false,
});

// 重置表单
function resetForm() {
  Object.assign(form, {
    id: 0,
    name: '',
    remark: '',
    level: 0,
    status: true,
    points_day: 0,
    points_week: 0,
    points_month: 0,
    points_free: false,
  });
}

// 打开新增弹窗
function openCreate() {
  resetForm();
  showModal.value = true;
}

// 打开编辑弹窗
function openEdit(row: GroupItem) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    remark: row.remark || '',
    level: Number(row.level || 0),
    status: Number(row.status) === 1,
    points_day: row.points_day || 0,
    points_week: row.points_week || 0,
    points_month: row.points_month || 0,
    points_free: Number(row.points_free) === 1,
  });
  showModal.value = true;
}

// 加载分类列表
async function loadCategories() {
  try {
    const res = await http.get('/admin/types');
    categories.value = (res.data?.items || []).filter((c: any) => c.type_pid === 0);
  } catch {
    /* ignore */
  }
}

// 解析权限字符串 (格式: type_id,list,detail,play,down,trysee|...)
function parsePopedom(str: string): Record<number, PermItem> {
  const result: Record<number, PermItem> = {};
  // 默认所有分类无权限
  for (const cat of categories.value) {
    result[cat.type_id] = {
      enabled: false,
      list: false,
      detail: false,
      play: false,
      down: false,
      trysee: false,
    };
  }
  if (!str) return result;
  const parts = str.split('|').filter(Boolean);
  for (const p of parts) {
    const [tid, ...perms] = p.split(',');
    const typeId = Number(tid);
    if (!typeId) continue;
    result[typeId] = {
      enabled: true,
      list: perms.includes('1'),
      detail: perms.includes('2'),
      play: perms.includes('3'),
      down: perms.includes('4'),
      trysee: perms.includes('5'),
    };
  }
  return result;
}

// 序列化权限为字符串
function serializePopedom(): string {
  const parts: string[] = [];
  for (const cat of categories.value) {
    const p = permData[cat.type_id];
    if (!p || !p.enabled) continue;
    const perms: string[] = [String(cat.type_id)];
    if (p.list) perms.push('1');
    if (p.detail) perms.push('2');
    if (p.play) perms.push('3');
    if (p.down) perms.push('4');
    if (p.trysee) perms.push('5');
    parts.push(perms.join(','));
  }
  return parts.join('|');
}

// 打开权限设置弹窗
async function openPerm(row: GroupItem) {
  permGroup.value = row;
  if (categories.value.length === 0) await loadCategories();
  const parsed = parsePopedom(row.popedom || '');
  Object.keys(permData).forEach((k) => delete permData[Number(k)]);
  Object.assign(permData, parsed);
  showPermModal.value = true;
}

// 全选权限
function selectAllPerm() {
  for (const cat of categories.value) {
    permData[cat.type_id] = {
      enabled: true,
      list: true,
      detail: true,
      play: true,
      down: true,
      trysee: true,
    };
  }
}

// 反选权限
function invertPerm() {
  for (const cat of categories.value) {
    const p = permData[cat.type_id];
    permData[cat.type_id] = {
      enabled: !p.enabled,
      list: !p.list,
      detail: !p.detail,
      play: !p.play,
      down: !p.down,
      trysee: !p.trysee,
    };
  }
}

// 保存权限
async function savePerm() {
  if (!permGroup.value) return;
  savingPerm.value = true;
  try {
    await http.post('/admin/members/groups/save', {
      id: permGroup.value.id,
      name: permGroup.value.name,
      popedom: serializePopedom(),
    });
    msg.success('权限保存成功');
    showPermModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    savingPerm.value = false;
  }
}

// 加载列表
async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/members/groups');
    items.value = (res.data?.items || []) as GroupItem[];
    selectedIds.value = [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

// 保存会员组
async function save() {
  if (!String(form.name || '').trim()) {
    msg.warning('请输入名称');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/members/groups/save', {
      id: form.id || undefined,
      name: form.name.trim(),
      remark: form.remark.trim(),
      level: Number(form.level || 0),
      status: form.status ? 1 : 0,
      points_day: form.points_day || 0,
      points_week: form.points_week || 0,
      points_month: form.points_month || 0,
      points_free: form.points_free ? 1 : 0,
    });
    msg.success('保存成功');
    showModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

// 删除会员组
async function remove(id: number) {
  try {
    await http.post('/admin/members/groups/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

// 处理选中
function handleCheck(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[];
}

// 批量启用
async function batchEnable() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/members/groups/batch-update-status', {
      ids: selectedIds.value,
      status: 1,
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
    await http.post('/admin/members/groups/batch-update-status', {
      ids: selectedIds.value,
      status: 0,
    });
    msg.success('批量禁用成功');
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

// 表格列定义
const columns: DataTableColumns<GroupItem> = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '名称', key: 'name', width: 120 },
  { title: '等级', key: 'level', width: 80 },
  { title: '会员数', key: 'member_count', width: 80 },
  { title: '每日积分', key: 'points_day', width: 100 },
  { title: '每周积分', key: 'points_week', width: 100 },
  { title: '免积分', key: 'points_free', width: 80, render: (r) => (r.points_free ? '是' : '否') },
  { title: '状态', key: 'status', width: 80, render: (r) => statusTag(r.status) },
  { title: '备注', key: 'remark', minWidth: 120, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row) },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          { size: 'small', tertiary: true, type: 'info', onClick: () => openPerm(row) },
          { default: () => '权限' }
        ),
        row.id !== 1
          ? h(
              NPopconfirm,
              { onPositiveClick: () => remove(row.id) },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', tertiary: true, type: 'error' },
                    { default: () => '删除' }
                  ),
                default: () => '确认删除该会员组？',
              }
            )
          : null,
      ]),
  },
];

onMounted(() => {
  load().catch(() => void 0);
});
</script>
