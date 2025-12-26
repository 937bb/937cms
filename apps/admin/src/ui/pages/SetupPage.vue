<template>
  <div class="bb-setup">
    <n-card title="初始化 937 CMS（首次启动）" style="max-width: 860px; width: 100%">
      <!-- 目录权限检测 -->
      <n-alert
        v-if="hasDirectoryError"
        type="error"
        title="目录权限错误"
        style="margin-bottom: 12px"
      >
        <div v-for="dir in status.directories?.filter((d) => !d.writable)" :key="dir.path">
          {{ dir.path }}: {{ dir.error || '无写入权限' }}
        </div>
      </n-alert>

      <n-alert
        v-if="status.configured && status.needsRestart"
        type="warning"
        title="已写入配置，但需要重启 API"
        style="margin-bottom: 12px"
      >
        由于当前 API 进程启动时还未加载数据库配置，请停止并重新启动
        API，然后再回到此页面点击「我已重启，去登录」。
      </n-alert>

      <n-alert
        v-else-if="status.configured"
        type="success"
        title="已初始化"
        style="margin-bottom: 12px"
      >
        系统已完成初始化，可直接前往登录。
      </n-alert>

      <n-form
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        label-width="150"
        size="medium"
      >
        <n-divider title-placement="left">MySQL 配置</n-divider>

        <n-form-item label="主机" path="mysqlHost">
          <n-input v-model:value="model.mysqlHost" placeholder="127.0.0.1" />
        </n-form-item>
        <n-form-item label="端口" path="mysqlPort">
          <n-input-number v-model:value="model.mysqlPort" :min="1" :max="65535" />
        </n-form-item>
        <n-form-item label="数据库名" path="mysqlDatabase">
          <n-input v-model:value="model.mysqlDatabase" placeholder="bb_cms" />
        </n-form-item>
        <n-form-item label="账号" path="mysqlUser">
          <n-input v-model:value="model.mysqlUser" />
        </n-form-item>
        <n-form-item label="密码" path="mysqlPassword">
          <n-input
            v-model:value="model.mysqlPassword"
            type="password"
            show-password-on="click"
            placeholder="请输入"
          />
        </n-form-item>
        <n-form-item label="自动创建数据库" path="mysqlCreateDatabase">
          <n-switch v-model:value="model.mysqlCreateDatabase" />
        </n-form-item>
        <n-form-item label=" ">
          <n-button :loading="testingMysql" type="primary" @click="onTestMysql"
            >测试 MySQL 连接</n-button
          >
          <n-text v-if="mysqlTested" depth="3" style="margin-left: 12px; color: #18a058"
            >✓ 连接成功</n-text
          >
        </n-form-item>

        <n-divider title-placement="left">管理员账号</n-divider>

        <n-form-item label="站点名称" path="siteName">
          <n-input v-model:value="model.siteName" placeholder="我的站点" />
        </n-form-item>
        <n-form-item label="管理员用户名" path="adminUser">
          <n-input v-model:value="model.adminUser" placeholder="admin" />
        </n-form-item>
        <n-form-item label="管理员密码" path="adminPassword">
          <n-input
            v-model:value="model.adminPassword"
            type="password"
            show-password-on="click"
            placeholder="至少 6 位"
          />
        </n-form-item>

        <n-divider title-placement="left">数据库选项</n-divider>

        <n-form-item label="覆盖数据库">
          <n-radio-group v-model:value="model.overwriteDatabase">
            <n-space>
              <n-radio :value="false">保留现有数据</n-radio>
              <n-radio :value="true">覆盖并重建</n-radio>
            </n-space>
          </n-radio-group>
          <n-text depth="3" style="margin-top: 8px; display: block"
            >首次初始化选「保留现有数据」，重新初始化选「覆盖并重建」</n-text
          >
        </n-form-item>
      </n-form>

      <n-space justify="end">
        <n-button v-if="status.configured && !status.needsRestart" secondary @click="goLogin"
          >去登录</n-button
        >
        <n-button v-else-if="status.configured && status.needsRestart" secondary @click="goLogin"
          >我已重启，去登录</n-button
        >
        <n-button
          v-else
          type="primary"
          :loading="loading"
          :disabled="!mysqlTested"
          @click="onSubmit"
          >开始初始化</n-button
        >
      </n-space>

      <n-divider />
      <n-space vertical>
        <n-text depth="3"
          >提示：初始化完成后，站外入库密码会由系统随机生成，可在「系统设置」里查看/修改。</n-text
        >
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../../lib/http';
import {
  clearSetupStatusCache,
  getSetupStatusCached,
  type SetupStatus,
} from '../../lib/setup-status';

const router = useRouter();
const msg = useMessage();

const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const testingMysql = ref(false);
const mysqlTested = ref(false);
const status = reactive<SetupStatus>({ configured: false, needsRestart: false, directories: [] });

const hasDirectoryError = computed(() => status.directories?.some((d) => !d.writable) ?? false);

const model = reactive({
  mysqlHost: '127.0.0.1',
  mysqlPort: 3306,
  mysqlDatabase: 'bb_cms',
  mysqlUser: 'root',
  mysqlPassword: '',
  mysqlCreateDatabase: true,
  adminUser: 'admin',
  adminPassword: '',
  siteName: '',
  overwriteDatabase: false,
});

const rules: FormRules = {
  mysqlHost: [{ required: true, message: '请输入 MySQL 主机', trigger: ['blur', 'input'] }],
  mysqlPort: [
    { required: true, type: 'number', message: '请输入 MySQL 端口', trigger: ['blur', 'change'] },
  ],
  mysqlDatabase: [{ required: true, message: '请输入数据库名', trigger: ['blur', 'input'] }],
  mysqlUser: [{ required: true, message: '请输入 MySQL 账号', trigger: ['blur', 'input'] }],
  mysqlPassword: [{ required: true, message: '请输入 MySQL 密码', trigger: ['blur', 'input'] }],
  adminUser: [{ required: true, message: '请输入管理员用户名', trigger: ['blur', 'input'] }],
  adminPassword: [
    { required: true, message: '请输入管理员密码（至少 6 位）', trigger: ['blur', 'input'] },
  ],
};

async function refreshStatus() {
  clearSetupStatusCache();
  const s = await getSetupStatusCached(0);
  status.configured = Boolean(s.configured);
  status.needsRestart = Boolean(s.needsRestart);
  status.directories = s.directories || [];
}

function goLogin() {
  router.push('/login');
}

async function onTestMysql() {
  if (!model.mysqlHost || !model.mysqlPort || !model.mysqlUser) {
    msg.warning('请先填写 MySQL 连接信息');
    return;
  }
  testingMysql.value = true;
  try {
    const res = await http.post('/admin/setup/test-mysql', {
      host: model.mysqlHost,
      port: model.mysqlPort,
      user: model.mysqlUser,
      password: model.mysqlPassword,
      database: model.mysqlCreateDatabase ? undefined : model.mysqlDatabase,
    });
    if (res.data?.ok) {
      mysqlTested.value = true;
      msg.success(res.data.message || 'MySQL 连接成功');
    } else {
      mysqlTested.value = false;
      msg.error(res.data?.message || 'MySQL 连接失败');
    }
  } catch (e: any) {
    mysqlTested.value = false;
    msg.error(e?.response?.data?.message || e?.message || '测试失败');
  } finally {
    testingMysql.value = false;
  }
}

async function onSubmit() {
  if (!mysqlTested.value) {
    msg.warning('请先测试 MySQL 连接');
    return;
  }
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;
  loading.value = true;
  try {
    const payload: Record<string, any> = { ...model };
    delete payload.redisEnabled;

    const res = await http.post('/admin/setup', payload);
    const interfacePass = String(res.data?.interfacePass || '');
    msg.success('初始化完成');
    if (interfacePass) {
      msg.info(`站外入库密码（interfacePass）：${interfacePass}`);
    }
    await refreshStatus();
  } catch (e: any) {
    const text = e?.response?.data?.message || e?.message || '初始化失败';
    msg.error(String(text));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshStatus().catch(() => void 0);
});
</script>

<style scoped>
.bb-setup {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
</style>
