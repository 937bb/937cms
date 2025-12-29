import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Tab {
  path: string;
  label: string;
  query?: Record<string, string>;
}

const STORAGE_KEY = 'admin_tabs';

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([]);
  const activeTab = ref<string>('');

  // 从 localStorage 恢复
  function restore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        tabs.value = data.tabs || [];
        activeTab.value = data.activeTab || '';
      }
    } catch {
      // 忽略
    }
  }

  // 保存到 localStorage
  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: tabs.value, activeTab: activeTab.value })
      );
    } catch {
      // 忽略
    }
  }

  // 获取 Tab 的唯一 key
  function getTabKey(path: string, query?: Record<string, string>) {
    if (!query || Object.keys(query).length === 0) return path;
    const queryStr = Object.entries(query)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${path}?${queryStr}`;
  }

  // 查找 Tab 索引
  function findTabIndex(path: string, query?: Record<string, string>) {
    return tabs.value.findIndex((t) => getTabKey(t.path, t.query) === getTabKey(path, query));
  }

  // 添加或激活 Tab
  function addTab(path: string, label: string, query?: Record<string, string>) {
    const idx = findTabIndex(path, query);
    if (idx >= 0) {
      // 已存在，直接激活
      activeTab.value = getTabKey(path, query);
    } else {
      // 新增 Tab
      tabs.value.push({ path, label, query });
      activeTab.value = getTabKey(path, query);
    }
    save();
  }

  // 关闭指定 Tab
  function closeTab(path: string, query?: Record<string, string>) {
    const idx = findTabIndex(path, query);
    if (idx >= 0) {
      const closedKey = getTabKey(path, query);
      tabs.value.splice(idx, 1);

      // 如果关闭的是活跃 Tab，切换到其他 Tab
      if (activeTab.value === closedKey) {
        if (tabs.value.length > 0) {
          activeTab.value = getTabKey(
            tabs.value[Math.max(0, idx - 1)].path,
            tabs.value[Math.max(0, idx - 1)].query
          );
        } else {
          activeTab.value = '';
        }
      }
      save();
    }
  }

  // 关闭其他 Tab
  function closeOtherTabs(path: string, query?: Record<string, string>) {
    const idx = findTabIndex(path, query);
    if (idx >= 0) {
      const kept = tabs.value[idx];
      tabs.value = [kept];
      activeTab.value = getTabKey(path, query);
      save();
    }
  }

  // 关闭右侧 Tab
  function closeRightTabs(path: string, query?: Record<string, string>) {
    const idx = findTabIndex(path, query);
    if (idx >= 0) {
      tabs.value = tabs.value.slice(0, idx + 1);
      activeTab.value = getTabKey(path, query);
      save();
    }
  }

  // 关闭所有 Tab
  function closeAllTabs() {
    tabs.value = [];
    activeTab.value = '';
    save();
  }

  // 设置活跃 Tab
  function setActiveTab(path: string, query?: Record<string, string>) {
    activeTab.value = getTabKey(path, query);
    save();
  }

  // 获取活跃 Tab 信息
  const activeTabInfo = computed(() => {
    return tabs.value.find((t) => getTabKey(t.path, t.query) === activeTab.value);
  });

  return {
    tabs,
    activeTab,
    restore,
    save,
    getTabKey,
    addTab,
    closeTab,
    closeOtherTabs,
    closeRightTabs,
    closeAllTabs,
    setActiveTab,
    activeTabInfo,
  };
});
