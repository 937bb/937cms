<template>
  <n-space vertical size="large">
    <n-card title="邮件配置">
      <n-form :model="model" label-placement="left" label-width="120" style="max-width: 980px">
        <n-form-item label="启用邮件">
          <n-switch v-model:value="model.enabled" :checked-value="1" :unchecked-value="0" />
        </n-form-item>

        <n-divider title-placement="left">SMTP 服务器</n-divider>

        <n-form-item label="SMTP 主机">
          <n-input v-model:value="model.host" placeholder="smtp.example.com" />
        </n-form-item>
        <n-form-item label="SMTP 端口">
          <n-input-number v-model:value="model.port" :min="1" :max="65535" style="width: 150px" />
        </n-form-item>
        <n-form-item label="加密方式">
          <n-radio-group v-model:value="model.secure">
            <n-radio :value="1">SSL/TLS (465)</n-radio>
            <n-radio :value="0">STARTTLS (587)</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="SMTP 用户名">
          <n-input v-model:value="model.user" placeholder="user@example.com" />
        </n-form-item>
        <n-form-item label="SMTP 密码">
          <n-input
            v-model:value="model.pass"
            type="password"
            show-password-on="click"
            placeholder="授权码或密码"
          />
        </n-form-item>
        <n-form-item label="发件人地址">
          <n-input v-model:value="model.from" placeholder="留空则使用 SMTP 用户名" />
        </n-form-item>
        <n-form-item label="发件人昵称">
          <n-input v-model:value="model.nick" placeholder="站点名称" />
        </n-form-item>
        <n-form-item label="超时时间">
          <n-input-number v-model:value="model.timeout" :min="5" :max="120" style="width: 150px" />
          <span style="margin-left: 8px">秒</span>
        </n-form-item>

        <n-divider title-placement="left">测试发送</n-divider>

        <n-form-item label="测试邮箱">
          <n-input v-model:value="testEmail" placeholder="输入收件人邮箱" style="width: 300px" />
          <n-button :loading="testing" style="margin-left: 12px" @click="onTest"
            >发送测试邮件</n-button
          >
        </n-form-item>

        <n-divider title-placement="left">邮件模板</n-divider>

        <n-form-item label="测试邮件标题">
          <n-input v-model:value="model.tpl.testTitle" placeholder="测试邮件 - {sitename}" />
        </n-form-item>
        <n-form-item label="测试邮件内容">
          <n-input v-model:value="model.tpl.testBody" type="textarea" :autosize="{ minRows: 2 }" />
        </n-form-item>

        <n-form-item label="注册验证标题">
          <n-input v-model:value="model.tpl.regTitle" placeholder="注册验证码 - {sitename}" />
        </n-form-item>
        <n-form-item label="注册验证内容">
          <n-input
            v-model:value="model.tpl.regBody"
            type="textarea"
            :autosize="{ minRows: 2 }"
            placeholder="变量: {code} {time}"
          />
        </n-form-item>

        <n-form-item label="绑定验证标题">
          <n-input v-model:value="model.tpl.bindTitle" placeholder="绑定验证码 - {sitename}" />
        </n-form-item>
        <n-form-item label="绑定验证内容">
          <n-input
            v-model:value="model.tpl.bindBody"
            type="textarea"
            :autosize="{ minRows: 2 }"
            placeholder="变量: {code} {time}"
          />
        </n-form-item>

        <n-form-item label="找回密码标题">
          <n-input v-model:value="model.tpl.findpassTitle" placeholder="找回密码 - {sitename}" />
        </n-form-item>
        <n-form-item label="找回密码内容">
          <n-input
            v-model:value="model.tpl.findpassBody"
            type="textarea"
            :autosize="{ minRows: 2 }"
            placeholder="变量: {code} {time}"
          />
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
const testing = ref(false);
const testEmail = ref('');

const model = reactive({
  enabled: 0,
  host: '',
  port: 465,
  secure: 1,
  user: '',
  pass: '',
  from: '',
  nick: '',
  timeout: 30,
  tpl: {
    testTitle: '',
    testBody: '',
    regTitle: '',
    regBody: '',
    bindTitle: '',
    bindBody: '',
    findpassTitle: '',
    findpassBody: '',
  },
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/email');
    const data = res.data || {};
    Object.assign(model, {
      enabled: data.enabled ?? 0,
      host: data.host || '',
      port: data.port || 465,
      secure: data.secure ?? 1,
      user: data.user || '',
      pass: data.pass || '',
      from: data.from || '',
      nick: data.nick || '',
      timeout: data.timeout || 30,
      tpl: {
        testTitle: data.tpl?.testTitle || '',
        testBody: data.tpl?.testBody || '',
        regTitle: data.tpl?.regTitle || '',
        regBody: data.tpl?.regBody || '',
        bindTitle: data.tpl?.bindTitle || '',
        bindBody: data.tpl?.bindBody || '',
        findpassTitle: data.tpl?.findpassTitle || '',
        findpassBody: data.tpl?.findpassBody || '',
      },
    });
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/email', model);
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function onTest() {
  if (!testEmail.value.trim()) {
    msg.warning('请输入测试邮箱');
    return;
  }
  testing.value = true;
  try {
    const res = await http.post('/admin/system-settings/email/test', {
      to: testEmail.value.trim(),
    });
    if (res.data?.ok) {
      msg.success(res.data.message || '发送成功');
    } else {
      msg.error(res.data?.message || '发送失败');
    }
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '发送失败'));
  } finally {
    testing.value = false;
  }
}

onMounted(() => load().catch(() => void 0));
</script>
