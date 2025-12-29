import { ref, computed } from 'vue';
import { http } from '../lib/http';
import type { ThemeConfig, ThemeConfigKey, ThemeConfigValue } from '../types/theme-config';

const themeConfig = ref<ThemeConfig>({});
const isLoading = ref(false);
const isLoaded = ref(false);

export function useThemeConfig() {
  const loadConfig = async (themeName: string = 'mxpro'): Promise<ThemeConfig> => {
    if (isLoaded.value) return themeConfig.value;

    isLoading.value = true;
    try {
      const response = await http.get(`/api/v1/theme?name=${themeName}`);
      themeConfig.value = response.data || {};
      isLoaded.value = true;
      return themeConfig.value;
    } catch (error) {
      console.error('Failed to load theme config:', error);
      return {};
    } finally {
      isLoading.value = false;
    }
  };

  const getConfig = <K extends ThemeConfigKey>(
    key: K,
    defaultValue?: ThemeConfigValue<K>
  ): ThemeConfigValue<K> => {
    return (themeConfig.value[key] ?? defaultValue) as ThemeConfigValue<K>;
  };

  const config = computed(() => themeConfig.value);

  return {
    config,
    isLoading,
    isLoaded,
    loadConfig,
    getConfig,
  };
}
