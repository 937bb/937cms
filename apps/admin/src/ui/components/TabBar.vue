<template>
  <div v-if="tabs.length" class="tab-bar">
    <div class="tabs-container" @contextmenu.prevent="onTabsContextMenu">
      <n-tabs
        :value="activeTab"
        type="card"
        closable
        size="small"
        @update:value="onTabChange"
        @close="onTabClose"
      >
        <n-tab-pane
          v-for="tab in tabs"
          :key="getTabKey(tab.path, tab.query)"
          :name="getTabKey(tab.path, tab.query)"
          :tab="tab.label"
          @contextmenu.prevent="(e) => onTabContextMenu(e, tab)"
        />
      </n-tabs>
    </div>
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :show="showMenu"
      :options="menuOptions"
      :x="menuX"
      :y="menuY"
      @select="onMenuSelect"
      @clickoutside="showMenu = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NTabs, NTabPane, NDropdown } from 'naive-ui';
import { useTabsStore, type Tab } from '../../stores/tabs';

const router = useRouter();
const tabsStore = useTabsStore();

const tabs = computed(() => tabsStore.tabs);
const activeTab = computed(() => tabsStore.activeTab);

const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const contextTab = ref<Tab | null>(null);

function getTabKey(path: string, query?: Record<string, string>) {
  return tabsStore.getTabKey(path, query);
}

function onTabChange(key: string) {
  const tab = tabs.value.find((t) => getTabKey(t.path, t.query) === key);
  if (tab) {
    router.push({ path: tab.path, query: tab.query });
  }
}

function onTabClose({ name }: { name: string }) {
  const tab = tabs.value.find((t) => getTabKey(t.path, t.query) === name);
  if (tab) {
    tabsStore.closeTab(tab.path, tab.query);
    showMenu.value = false;
  }
}

function onTabContextMenu(e: MouseEvent, tab: Tab) {
  e.stopPropagation();
  contextTab.value = tab;
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  showMenu.value = true;
}

function onTabsContextMenu(e: MouseEvent) {
  if (tabs.value.length > 0) {
    contextTab.value = tabs.value[0];
    menuX.value = e.clientX;
    menuY.value = e.clientY;
    showMenu.value = true;
  }
}

const menuOptions = computed(() => {
  if (!contextTab.value) return [];
  return [
    { label: '关闭', key: 'close' },
    { label: '关闭其他', key: 'closeOther' },
    { label: '关闭右侧', key: 'closeRight' },
    { label: '关闭全部', key: 'closeAll' },
  ];
});

function onMenuSelect(key: string) {
  if (!contextTab.value) return;

  switch (key) {
    case 'close':
      tabsStore.closeTab(contextTab.value.path, contextTab.value.query);
      break;
    case 'closeOther':
      tabsStore.closeOtherTabs(contextTab.value.path, contextTab.value.query);
      break;
    case 'closeRight':
      tabsStore.closeRightTabs(contextTab.value.path, contextTab.value.query);
      break;
    case 'closeAll':
      tabsStore.closeAllTabs();
      break;
  }
  showMenu.value = false;
  contextTab.value = null;
}
</script>

<style scoped>
.tab-bar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tabs-container {
  padding: 0;
}

:deep(.n-tabs) {
  font-size: 13px;
}

:deep(.n-tabs-nav) {
  padding: 0 8px;
  background: white;
}

:deep(.n-tab-pane) {
  padding: 0 !important;
}

:deep(.n-tabs-tab) {
  padding: 8px 16px !important;
  margin: 0 4px;
  border-radius: 4px 4px 0 0;
  background: #f3f4f6;
  color: #6b7280;
  transition: all 0.2s ease;
}

:deep(.n-tabs-tab:hover) {
  background: #e5e7eb;
  color: #374151;
}

:deep(.n-tabs-tab--active) {
  background: white;
  color: #1f2937;
  box-shadow: 0 -2px 0 0 var(--n-color-target) inset;
}

:deep(.n-tabs-tab__close) {
  margin-left: 8px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

:deep(.n-tabs-tab:hover .n-tabs-tab__close) {
  opacity: 1;
}
</style>
