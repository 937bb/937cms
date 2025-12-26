<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <router-view />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { dateZhCN, zhCN } from 'naive-ui';
</script>
