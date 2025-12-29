<template>
  <n-space vertical size="large">
    <n-card title="评论配置">
      <n-tabs type="line" animated>
        <n-tab-pane name="gbook" tab="留言板">
          <n-form
            :model="model.gbook"
            label-placement="left"
            label-width="160"
            style="max-width: 760px"
          >
            <n-form-item label="启用留言板">
              <n-switch
                v-model:value="model.gbook.status"
                :checked-value="1"
                :unchecked-value="0"
              />
            </n-form-item>
            <n-form-item label="留言需要审核">
              <n-switch v-model:value="model.gbook.audit" :checked-value="1" :unchecked-value="0" />
            </n-form-item>
            <n-form-item label="留言必须登录">
              <n-switch v-model:value="model.gbook.login" :checked-value="1" :unchecked-value="0" />
            </n-form-item>
            <n-form-item label="留言验证码">
              <n-switch
                v-model:value="model.gbook.verify"
                :checked-value="1"
                :unchecked-value="0"
              />
            </n-form-item>
            <n-form-item label="每页数量">
              <n-input-number v-model:value="model.gbook.pagesize" :min="1" :max="200" />
            </n-form-item>
            <n-form-item label="发布间隔(秒)">
              <n-input-number v-model:value="model.gbook.timespan" :min="0" :max="3600" />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="comment" tab="评论">
          <n-form
            :model="model.comment"
            label-placement="left"
            label-width="160"
            style="max-width: 760px"
          >
            <n-form-item label="启用评论">
              <n-switch
                v-model:value="model.comment.status"
                :checked-value="1"
                :unchecked-value="0"
              />
            </n-form-item>
            <n-form-item label="评论需要审核">
              <n-switch
                v-model:value="model.comment.audit"
                :checked-value="1"
                :unchecked-value="0"
              />
              <template #feedback>开启后，新评论写入为未审核（前台不展示）。</template>
            </n-form-item>
            <n-form-item label="评论必须登录">
              <n-switch
                v-model:value="model.comment.login"
                :checked-value="1"
                :unchecked-value="0"
              />
            </n-form-item>
            <n-form-item label="评论验证码">
              <n-switch
                v-model:value="model.comment.verify"
                :checked-value="1"
                :unchecked-value="0"
              />
            </n-form-item>
            <n-form-item label="每页数量">
              <n-input-number v-model:value="model.comment.pagesize" :min="1" :max="200" />
            </n-form-item>
            <n-form-item label="发布间隔(秒)">
              <n-input-number v-model:value="model.comment.timespan" :min="0" :max="3600" />
            </n-form-item>

            <n-divider title-placement="left">扩展（937CMS）</n-divider>
            <n-form-item label="最大长度">
              <n-input-number v-model:value="model.comment.maxLen" :min="10" :max="2000" />
            </n-form-item>
            <n-form-item label="发布冷却(秒)">
              <n-input-number v-model:value="model.comment.cooldownSeconds" :min="0" :max="3600" />
            </n-form-item>
          </n-form>
        </n-tab-pane>
      </n-tabs>

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

const model = reactive({
  gbook: {
    status: 1,
    audit: 1,
    login: 0,
    verify: 0,
    pagesize: 20,
    timespan: 10,
  },
  comment: {
    status: 1,
    audit: 0,
    login: 0,
    verify: 0,
    pagesize: 20,
    timespan: 10,
    maxLen: 300,
    cooldownSeconds: 10,
  },
});

async function load() {
  loading.value = true;
  try {
    const res = await http.get('/admin/system-settings/comment');
    const data = res.data || {};

    // 新结构：{ gbook: {...}, comment: {...} }
    if (data.gbook || data.comment) {
      Object.assign(model.gbook, data.gbook || {});
      Object.assign(model.comment, data.comment || {});
      model.gbook.status = Number(model.gbook.status || 0) ? 1 : 0;
      model.gbook.audit = Number(model.gbook.audit || 0) ? 1 : 0;
      model.gbook.login = Number(model.gbook.login || 0) ? 1 : 0;
      model.gbook.verify = Number(model.gbook.verify || 0) ? 1 : 0;
      model.gbook.pagesize = Number(model.gbook.pagesize || 20);
      model.gbook.timespan = Number(model.gbook.timespan || 10);

      model.comment.status = Number(model.comment.status || 0) ? 1 : 0;
      model.comment.audit = Number(model.comment.audit || 0) ? 1 : 0;
      model.comment.login = Number(model.comment.login || 0) ? 1 : 0;
      model.comment.verify = Number(model.comment.verify || 0) ? 1 : 0;
      model.comment.pagesize = Number(model.comment.pagesize || 20);
      model.comment.timespan = Number(model.comment.timespan || 10);
      model.comment.maxLen = Number((model.comment as any).maxLen || 300);
      model.comment.cooldownSeconds = Number((model.comment as any).cooldownSeconds || 10);
      return;
    }

    // 旧结构兼容：{ enabled,audit,needLogin,maxLen,cooldownSeconds }
    const enabled = Number(data.enabled || 0) === 1 ? 1 : 0;
    const audit = Number(data.audit || 0) === 1 ? 1 : 0;
    const needLogin = Number(data.needLogin || 0) === 1 ? 1 : 0;
    const maxLen = Number(data.maxLen || 300);
    const cooldownSeconds = Number(data.cooldownSeconds || 10);
    model.comment.status = enabled;
    model.comment.audit = audit;
    model.comment.login = needLogin;
    model.comment.maxLen = maxLen;
    model.comment.cooldownSeconds = cooldownSeconds;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/system-settings/comment', {
      gbook: {
        status: Number(model.gbook.status || 0) ? 1 : 0,
        audit: Number(model.gbook.audit || 0) ? 1 : 0,
        login: Number(model.gbook.login || 0) ? 1 : 0,
        verify: Number(model.gbook.verify || 0) ? 1 : 0,
        pagesize: Number(model.gbook.pagesize || 20),
        timespan: Number(model.gbook.timespan || 0),
      },
      comment: {
        status: Number(model.comment.status || 0) ? 1 : 0,
        audit: Number(model.comment.audit || 0) ? 1 : 0,
        login: Number(model.comment.login || 0) ? 1 : 0,
        verify: Number(model.comment.verify || 0) ? 1 : 0,
        pagesize: Number(model.comment.pagesize || 20),
        timespan: Number(model.comment.timespan || 0),
        maxLen: Number((model.comment as any).maxLen || 300),
        cooldownSeconds: Number((model.comment as any).cooldownSeconds || 0),
      },
    });
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => load().catch(() => void 0));
</script>
