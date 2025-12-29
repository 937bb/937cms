<template>
  <div class="api-key-page">
    <n-space vertical :size="16">
      <n-space justify="space-between" align="center">
        <h2>API Key 管理</h2>
        <n-button type="primary" @click="showCreateModal = true"> 创建 API Key </n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="apiKeys"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        :single-line="false"
      />
    </n-space>

    <n-modal
      v-model:show="showCreateModal"
      title="创建 API Key"
      preset="dialog"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreate"
      @negative-click="showCreateModal = false"
    >
      <n-space vertical>
        <n-form-item label="名称">
          <n-input v-model:value="formData.name" placeholder="输入 API Key 名称" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input
            v-model:value="formData.remark"
            type="textarea"
            placeholder="输入备注信息（可选）"
            :rows="3"
          />
        </n-form-item>
        <n-form-item label="IP 限制">
          <n-input
            v-model:value="formData.ip_limit"
            placeholder="输入 IP 地址，多个用逗号分隔（可选）"
          />
        </n-form-item>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="showEditModal"
      title="编辑 API Key"
      preset="dialog"
      positive-text="保存"
      negative-text="取消"
      @positive-click="handleUpdate"
      @negative-click="showEditModal = false"
    >
      <n-space vertical>
        <n-form-item label="名称">
          <n-input v-model:value="editData.name" placeholder="输入 API Key 名称" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input
            v-model:value="editData.remark"
            type="textarea"
            placeholder="输入备注信息（可选）"
            :rows="3"
          />
        </n-form-item>
        <n-form-item label="IP 限制">
          <n-input
            v-model:value="editData.ip_limit"
            placeholder="输入 IP 地址，多个用逗号分隔（可选）"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="editData.enabled"
            :options="[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]"
          />
        </n-form-item>
      </n-space>
    </n-modal>

    <n-modal
      v-model:show="showViewModal"
      title="API Key"
      preset="dialog"
      positive-text="关闭"
      @positive-click="showViewModal = false"
    >
      <n-space vertical>
        <n-alert type="warning" title="重要提示">
          请妥善保管此 Key，关闭此窗口后将无法再次查看完整的 Key。
        </n-alert>
        <n-form-item label="API Key">
          <n-input :value="viewKey" type="password" show-password-on="click" readonly />
        </n-form-item>
        <n-button type="primary" block @click="copyKey"> 复制 Key </n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import {
  NButton,
  NSpace,
  NDataTable,
  NModal,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NAlert,
  useMessage,
} from 'naive-ui';
import { http } from '../../../lib/http';

const message = useMessage();

interface ApiKey {
  id: number;
  name: string;
  key: string;
  keyDisplay?: string;
  remark?: string;
  ip_limit?: string;
  enabled: number;
  created_at: number;
  last_used_at?: number;
}

const loading = ref(false);
const apiKeys = ref<ApiKey[]>([]);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const viewKey = ref('');
const editingId = ref<number | null>(null);

const formData = ref({
  name: '',
  remark: '',
  ip_limit: '',
});

const editData = ref({
  name: '',
  remark: '',
  ip_limit: '',
  enabled: 1,
});

const pagination = {
  pageSize: 10,
};

const columns = computed(() => [
  {
    title: '名称',
    key: 'name',
    width: 120,
  },
  {
    title: 'API Key',
    key: 'keyDisplay',
    width: 150,
    render: (row: ApiKey) => row.keyDisplay || row.key,
  },
  {
    title: '备注',
    key: 'remark',
    width: 150,
    render: (row: ApiKey) => row.remark || '-',
  },
  {
    title: 'IP 限制',
    key: 'ip_limit',
    width: 150,
    render: (row: ApiKey) => row.ip_limit || '无限制',
  },
  {
    title: '状态',
    key: 'enabled',
    width: 80,
    render: (row: ApiKey) => (row.enabled ? '启用' : '禁用'),
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 150,
    render: (row: ApiKey) => new Date(row.created_at * 1000).toLocaleString(),
  },
  {
    title: '最后使用',
    key: 'last_used_at',
    width: 150,
    render: (row: ApiKey) =>
      row.last_used_at ? new Date(row.last_used_at * 1000).toLocaleString() : '未使用',
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: ApiKey) =>
      h(
        NSpace,
        { size: 'small' },
        {
          default: () => [
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => handleView(row),
              },
              { default: () => '查看' }
            ),
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => handleEdit(row),
              },
              { default: () => '编辑' }
            ),
            h(
              NButton,
              {
                text: true,
                type: 'error',
                onClick: () => handleDelete(row.id),
              },
              { default: () => '删除' }
            ),
          ],
        }
      ),
  },
]);

const fetchApiKeys = async () => {
  loading.value = true;
  try {
    const response = await http.get('/admin/api-keys');
    apiKeys.value = response.data?.data || [];
  } catch (error) {
    message.error('获取 API Key 列表失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = async () => {
  if (!formData.value.name) {
    message.error('请输入 API Key 名称');
    return;
  }

  try {
    const response = await http.post('/admin/api-keys', {
      name: formData.value.name,
      remark: formData.value.remark,
      ip_limit: formData.value.ip_limit,
    });

    message.success('API Key 创建成功');
    viewKey.value = response.data?.data?.key;
    showCreateModal.value = false;
    showViewModal.value = true;
    formData.value = { name: '', remark: '', ip_limit: '' };
    await fetchApiKeys();
  } catch (error) {
    message.error('创建 API Key 失败');
  }
};

const handleView = (row: ApiKey) => {
  viewKey.value = row.key;
  showViewModal.value = true;
};

const handleEdit = (row: ApiKey) => {
  editingId.value = row.id;
  editData.value = {
    name: row.name,
    remark: row.remark || '',
    ip_limit: row.ip_limit || '',
    enabled: row.enabled,
  };
  showEditModal.value = true;
};

const handleUpdate = async () => {
  if (!editingId.value) return;

  try {
    await http.put(`/admin/api-keys/${editingId.value}`, editData.value);

    message.success('API Key 更新成功');
    showEditModal.value = false;
    await fetchApiKeys();
  } catch (error) {
    message.error('更新 API Key 失败');
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除此 API Key 吗？')) return;

  try {
    await http.delete(`/admin/api-keys/${id}`);

    message.success('API Key 删除成功');
    await fetchApiKeys();
  } catch (error) {
    message.error('删除 API Key 失败');
  }
};

const copyKey = () => {
  navigator.clipboard.writeText(viewKey.value);
  message.success('已复制到剪贴板');
};

onMounted(() => {
  fetchApiKeys();
});
</script>

<style scoped>
.api-key-page {
  padding: 20px;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
