<template>
  <n-space vertical size="large">
    <n-card title="管理员账号">
      <n-space justify="space-between" align="center" style="margin-bottom: 12px">
        <n-button type="primary" @click="openCreate">新增管理员</n-button>
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="(r: any) => r.id"
      />
    </n-card>

    <!-- 新增弹窗 -->
    <n-modal v-model:show="showCreate" preset="card" title="新增管理员" style="max-width: 480px">
      <n-form :model="createForm" label-placement="left" label-width="100">
        <n-form-item label="用户名" required>
          <n-input v-model:value="createForm.username" placeholder="至少 3 位" />
        </n-form-item>
        <n-form-item label="密码" required>
          <n-input
            v-model:value="createForm.password"
            type="password"
            show-password-on="click"
            placeholder="至少 6 位"
          />
        </n-form-item>
        <n-form-item label="角色">
          <n-input v-model:value="createForm.role" placeholder="admin" />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showCreate = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="onCreate">创建</n-button>
      </n-space>
    </n-modal>

    <!-- 重置密码弹窗 -->
    <n-modal v-model:show="showReset" preset="card" title="重置密码" style="max-width: 400px">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="新密码" required>
          <n-input
            v-model:value="resetForm.newPassword"
            type="password"
            show-password-on="click"
            placeholder="至少 6 位"
          />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary @click="showReset = false">取消</n-button>
        <n-button type="primary" :loading="resetting" @click="onReset">确认重置</n-button>
      </n-space>
    </n-modal>

    <!-- 修改自己密码 -->
    <n-card title="修改我的密码" style="max-width: 480px">
      <n-form :model="pwdForm" label-placement="left" label-width="100">
        <n-form-item label="原密码" required>
          <n-input v-model:value="pwdForm.oldPassword" type="password" show-password-on="click" />
        </n-form-item>
        <n-form-item label="新密码" required>
          <n-input
            v-model:value="pwdForm.newPassword"
            type="password"
            show-password-on="click"
            placeholder="至少 6 位"
          />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button type="primary" :loading="changingPwd" @click="onChangePwd">修改密码</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

type AdminItem = {
  id: number;
  username: string;
  role: string;
  created_at: number;
  updated_at: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const changingPwd = ref(false);
const items = ref<AdminItem[]>([]);

const showCreate = ref(false);
const createForm = reactive({ username: '', password: '', role: 'admin' });

const showReset = ref(false);
const resetForm = reactive({ id: 0, newPassword: '' });

const pwdForm = reactive({ oldPassword: '', newPassword: '' });

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/admins');
    items.value = res.data?.items || [];
  } catch (e: any) {
    msg.error(e?.response?.data?.message || e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.username = '';
  createForm.password = '';
  createForm.role = 'admin';
  showCreate.value = true;
}

async function onCreate() {
  if (!createForm.username.trim() || !createForm.password.trim()) {
    msg.warning('请填写用户名和密码');
    return;
  }
  saving.value = true;
  try {
    await http.post('/admin/admins/create', createForm);
    msg.success('创建成功');
    showCreate.value = false;
    await load();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || e?.message || '创建失败');
  } finally {
    saving.value = false;
  }
}

function openReset(row: AdminItem) {
  resetForm.id = row.id;
  resetForm.newPassword = '';
  showReset.value = true;
}

async function onReset() {
  if (!resetForm.newPassword.trim()) {
    msg.warning('请输入新密码');
    return;
  }
  resetting.value = true;
  try {
    await http.post('/admin/admins/reset-password', resetForm);
    msg.success('重置成功');
    showReset.value = false;
  } catch (e: any) {
    msg.error(e?.response?.data?.message || e?.message || '重置失败');
  } finally {
    resetting.value = false;
  }
}

async function onDelete(id: number) {
  try {
    await http.post('/admin/admins/delete', { id });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(e?.response?.data?.message || e?.message || '删除失败');
  }
}

async function onChangePwd() {
  if (!pwdForm.oldPassword.trim() || !pwdForm.newPassword.trim()) {
    msg.warning('请填写原密码和新密码');
    return;
  }
  changingPwd.value = true;
  try {
    await http.post('/admin/admins/password', pwdForm);
    msg.success('密码修改成功');
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
  } catch (e: any) {
    msg.error(e?.response?.data?.message || e?.message || '修改失败');
  } finally {
    changingPwd.value = false;
  }
}

const columns: DataTableColumns<AdminItem> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户名', key: 'username', width: 150 },
  { title: '角色', key: 'role', width: 100 },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row) =>
      h('div', { style: 'display:flex;gap:8px' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openReset(row) },
          { default: () => '重置密码' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => onDelete(row.id) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除？',
          }
        ),
      ]),
  },
];

onMounted(() => load().catch(() => void 0));
</script>
