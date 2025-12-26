<template>
  <n-space vertical size="large">
    <n-card title="Redis 缓存配置">
      <n-form :model="model" label-placement="left" label-width="140" style="max-width: 720px">
        <n-form-item label="启用 Redis">
          <n-switch v-model:value="model.enabled" :checked-value="1" :unchecked-value="0" />
        </n-form-item>

        <template v-if="model.enabled">
          <n-form-item label="主机">
            <n-input v-model:value="model.host" placeholder="127.0.0.1" />
          </n-form-item>
          <n-form-item label="端口">
            <n-input-number v-model:value="model.port" :min="1" :max="65535" />
          </n-form-item>
          <n-form-item label="密码">
            <n-input
              v-model:value="model.password"
              type="password"
              show-password-on="click"
              placeholder="无密码可留空"
            />
          </n-form-item>
          <n-form-item label="数据库">
            <n-input-number v-model:value="model.db" :min="0" :max="15" />
            <template #feedback>选择 Redis 数据库（0-15），默认为 0</template>
          </n-form-item>
          <n-form-item label="Key 前缀">
            <n-input v-model:value="model.keyPrefix" placeholder="cms:" />
            <template #feedback>用于区分不同站点的缓存，建议以冒号结尾</template>
          </n-form-item>
          <n-form-item label="默认缓存时间">
            <n-input-number v-model:value="model.cacheTtl" :min="60" :max="86400" />
            <template #feedback>单位：秒（默认 3600 秒 = 1 小时）</template>
          </n-form-item>
          <n-form-item label=" ">
            <n-button :loading="testing" @click="onTestConnection">测试连接</n-button>
          </n-form-item>
        </template>
      </n-form>

      <template v-if="model.enabled">
        <n-divider />
        <div style="margin-bottom: 16px">
          <n-text strong>模块缓存配置</n-text>
        </div>
        <n-space vertical style="width: 100%">
          <div
            v-for="(moduleName, key) in moduleNames"
            :key="key"
            style="display: flex; align-items: center; gap: 16px; padding: 8px 0"
          >
            <div style="width: 100px">{{ moduleName }}</div>
            <n-switch
              v-model:value="model.modules[key].enabled"
              :checked-value="1"
              :unchecked-value="0"
            />
            <n-input-number
              v-model:value="model.modules[key].ttl"
              :min="60"
              :max="86400"
              style="width: 120px"
            />
            <span style="color: #999; font-size: 12px">秒</span>
          </div>
        </n-space>
      </template>

      <n-space justify="end">
        <n-button secondary :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-card>

    <n-card v-if="model.enabled" title="缓存管理">
      <n-space>
        <n-button type="warning" :loading="clearing" @click="clearCache">一键清理缓存</n-button>
      </n-space>
      <n-text depth="3" style="display: block; margin-top: 12px">
        清理所有以「{{ model.keyPrefix || 'cms:' }}」开头的缓存数据
      </n-text>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage, NSwitch, NInputNumber } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { http } from '../../../lib/http';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const clearing = ref(false);
const testing = ref(false);

const moduleNames = {
  vodQuery: '视频查询',
  search: '搜索',
  theme: '主题',
  config: '配置',
  types: '分类',
} as const;

const model = reactive({
  enabled: 0,
  host: '127.0.0.1',
  port: 6379,
  password: '',
  db: 0,
  keyPrefix: 'cms:',
  cacheTtl: 3600,
  modules: {
    vodQuery: { enabled: 1, ttl: 3600 },
    search: { enabled: 1, ttl: 600 },
    theme: { enabled: 1, ttl: 3600 },
    config: { enabled: 1, ttl: 3600 },
    types: { enabled: 1, ttl: 3600 },
  },
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/redis');
    Object.assign(model, res.data || {});
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/redis', model);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function onTestConnection() {
  if (!model.host || !model.port) {
    msg.warning('请先填写 Redis 连接信息');
    return;
  }
  testing.value = true;
  try {
    const res = await http.post('/admin/system-settings/redis/test', {
      host: model.host,
      port: model.port,
      password: model.password,
      db: model.db,
    });
    if (res.data?.ok) {
      msg.success(res.data.message || 'Redis 连接成功');
    } else {
      msg.error(res.data?.message || 'Redis 连接失败');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '测试失败'));
  } finally {
    testing.value = false;
  }
}

async function clearCache() {
  clearing.value = true;
  try {
    const res = await http.post('/admin/system-settings/redis/clear');
    if (res.data?.ok) {
      msg.success(res.data.message || '清理成功');
    } else {
      msg.error(res.data?.message || '清理失败');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '清理失败'));
  } finally {
    clearing.value = false;
  }
}

onMounted(() => {
  load().catch(() => void 0);
});
</script>
