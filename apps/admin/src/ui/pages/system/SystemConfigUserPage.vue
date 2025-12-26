<template>
  <n-space vertical size="large">
    <n-card title="会员配置">
      <n-form :model="userModel" label-placement="left" label-width="140" style="max-width: 720px">
        <n-form-item label="开启会员功能">
          <n-switch v-model:value="userModel.status" :checked-value="1" :unchecked-value="0" />
        </n-form-item>
        <n-form-item label="开放注册">
          <n-switch v-model:value="userModel.regStatus" :checked-value="1" :unchecked-value="0" />
        </n-form-item>
        <n-form-item label="注册验证码">
          <n-switch v-model:value="userModel.regVerify" :checked-value="1" :unchecked-value="0" />
        </n-form-item>
        <n-form-item label="登录验证码">
          <n-switch v-model:value="userModel.loginVerify" :checked-value="1" :unchecked-value="0" />
          <template #feedback>
            开启后，前台登录弹窗将显示验证码（接口：`/api/v1/verify`）。
          </template>
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);

const userModel = reactive({
  status: 1,
  regStatus: 1,
  regVerify: 0,
  loginVerify: 0,
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/user');
    userModel.status = res.data?.status ?? 1;
    userModel.regStatus = res.data?.regStatus ?? 1;
    userModel.regVerify = res.data?.regVerify ?? 0;
    userModel.loginVerify = res.data?.loginVerify ?? 0;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载会员配置失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/user', userModel);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  load().catch(() => void 0);
});
</script>
