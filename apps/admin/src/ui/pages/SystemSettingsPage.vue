<template>
  <n-space vertical size="large">
    <!-- 系统信息卡片 -->
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

      <!-- 迁移历史 -->
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

    <!-- 系统设置卡片 -->
    <n-card title="系统设置">
      <n-form :model="model" label-placement="left" label-width="140" style="max-width: 720px">
        <n-form-item label="站点名称">
          <n-input v-model:value="model.siteName" placeholder="我的站点" />
        </n-form-item>
        <n-form-item label="站外入库密码">
          <n-input v-model:value="model.interfacePass" placeholder="用于站外入库" />
          <template #feedback>
            该密码用于资源站推送到本系统（站外入库）。建议至少 16 位随机字符串。
          </template>
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-card>

    <!-- 会员配置卡片 -->
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
        <n-button secondary :loading="userLoading" @click="loadUser">刷新</n-button>
        <n-button type="primary" :loading="userSaving" @click="saveUser">保存</n-button>
      </n-space>
    </n-card>

    <!-- 扩展分类配置卡片 -->
    <n-card title="扩展分类配置">
      <n-alert type="info" style="margin-bottom: 16px">
        全局扩展分类配置，用于前台筛选功能。分类未单独配置时将使用此默认值。多个选项用英文逗号分隔。
      </n-alert>
      <n-form
        :model="extendModel"
        label-placement="left"
        label-width="140"
        style="max-width: 720px"
      >
        <n-form-item label="视频剧情/类型">
          <n-input
            v-model:value="extendModel.vodExtendClass"
            type="textarea"
            :rows="2"
            placeholder="动作,喜剧,爱情,科幻,恐怖,战争,犯罪,动画,奇幻,武侠,冒险,枪战,悬疑,惊悚,经典,青春,文艺,微电影,古装,历史,运动,农村,儿童,网络电影"
          />
        </n-form-item>
        <n-form-item label="视频地区">
          <n-input
            v-model:value="extendModel.vodExtendArea"
            type="textarea"
            :rows="2"
            placeholder="大陆,香港,台湾,美国,韩国,日本,泰国,印度,英国,法国,德国,西班牙,加拿大,澳大利亚,其他"
          />
        </n-form-item>
        <n-form-item label="视频语言">
          <n-input
            v-model:value="extendModel.vodExtendLang"
            type="textarea"
            :rows="2"
            placeholder="国语,粤语,英语,韩语,日语,法语,德语,泰语,其他"
          />
        </n-form-item>
        <n-form-item label="视频年份">
          <n-input
            v-model:value="extendModel.vodExtendYear"
            type="textarea"
            :rows="2"
            placeholder="2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004"
          />
        </n-form-item>
        <n-form-item label="视频版本">
          <n-input
            v-model:value="extendModel.vodExtendVersion"
            placeholder="高清版,剧场版,抢先版,OVA,TV"
          />
        </n-form-item>
        <n-form-item label="视频状态">
          <n-input v-model:value="extendModel.vodExtendState" placeholder="正片,预告片,花絮" />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button secondary :loading="extendLoading" @click="loadExtend">刷新</n-button>
        <n-button type="primary" :loading="extendSaving" @click="saveExtend">保存</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage, type DataTableColumns } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { http } from '../../lib/http';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const infoLoading = ref(false);
const upgrading = ref(false);
const extendLoading = ref(false);
const extendSaving = ref(false);
const userLoading = ref(false);
const userSaving = ref(false);

// 系统设置数据
const model = reactive({
  siteName: '',
  interfacePass: '',
});

// 会员配置
const userModel = reactive({
  status: 1,
  regStatus: 1,
  regVerify: 0,
  loginVerify: 0,
});

// 扩展分类配置
const extendModel = reactive({
  vodExtendClass: '',
  vodExtendArea: '',
  vodExtendLang: '',
  vodExtendYear: '',
  vodExtendVersion: '',
  vodExtendState: '',
});

// 系统信息数据
const sysInfo = reactive({
  version: '',
  dbVersion: '',
  nodeVersion: '',
  platform: '',
  migrations: [] as { version: string; name: string; executed_at: number }[],
});

// 迁移历史表格列
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

// 加载系统信息
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

// 执行数据库升级
async function runUpgrade() {
  upgrading.value = true;
  try {
    const res = await http.post('/admin/system-settings/upgrade');
    if (res.data?.executed > 0) {
      msg.success(res.data?.message || '升级成功');
      await loadInfo(); // 刷新信息
    } else {
      msg.info(res.data?.message || '数据库已是最新版本');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '升级失败'));
  } finally {
    upgrading.value = false;
  }
}

// 加载系统设置
async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings');
    model.siteName = String(res.data?.siteName || '');
    model.interfacePass = String(res.data?.interfacePass || '');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

// 保存系统设置
async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/save', model);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function loadUser() {
  userLoading.value = true;
  try {
    const res = await http.get('/admin/system-settings/user');
    userModel.status = res.data?.status ?? 1;
    userModel.regStatus = res.data?.regStatus ?? 1;
    userModel.regVerify = res.data?.regVerify ?? 0;
    userModel.loginVerify = res.data?.loginVerify ?? 0;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载会员配置失败'));
  } finally {
    userLoading.value = false;
  }
}

async function saveUser() {
  userSaving.value = true;
  try {
    await http.post('/admin/system-settings/user', userModel);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    userSaving.value = false;
  }
}

// 加载扩展分类配置
async function loadExtend() {
  extendLoading.value = true;
  try {
    const res = await http.get('/admin/system-settings/extend');
    extendModel.vodExtendClass = res.data?.vodExtendClass || '';
    extendModel.vodExtendArea = res.data?.vodExtendArea || '';
    extendModel.vodExtendLang = res.data?.vodExtendLang || '';
    extendModel.vodExtendYear = res.data?.vodExtendYear || '';
    extendModel.vodExtendVersion = res.data?.vodExtendVersion || '';
    extendModel.vodExtendState = res.data?.vodExtendState || '';
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载扩展配置失败'));
  } finally {
    extendLoading.value = false;
  }
}

// 保存扩展分类配置
async function saveExtend() {
  extendSaving.value = true;
  try {
    await http.post('/admin/system-settings/extend', extendModel);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    extendSaving.value = false;
  }
}

onMounted(() => {
  loadInfo().catch(() => void 0);
  load().catch(() => void 0);
  loadUser().catch(() => void 0);
  loadExtend().catch(() => void 0);
});
</script>
