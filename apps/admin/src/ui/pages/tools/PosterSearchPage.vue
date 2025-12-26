<template>
  <n-space vertical size="large">
    <n-card title="海报搜索">
      <n-alert type="info" :bordered="false" style="margin-bottom: 16px">
        通过 TMDB 搜索电影/电视剧海报，点击复制按钮可复制海报链接。需要先在系统设置中配置 TMDB API
        Key。
      </n-alert>

      <n-space align="center" style="margin-bottom: 16px">
        <n-input
          v-model:value="keyword"
          placeholder="输入电影/电视剧名称搜索"
          style="width: 300px"
          clearable
          @keyup.enter="search()"
        />
        <n-select v-model:value="searchType" :options="typeOptions" style="width: 150px" />
        <n-button type="primary" :loading="searching" @click="search()">搜索</n-button>
      </n-space>

      <!-- 搜索结果 -->
      <template v-if="results.length">
        <n-space justify="space-between" align="center" style="margin-bottom: 12px">
          <span>共搜索到 {{ total }} 条结果（第 {{ page }}/{{ totalPages }} 页）</span>
          <n-space>
            <n-button :disabled="page <= 1" @click="goPage(page - 1)">上一页</n-button>
            <n-button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</n-button>
          </n-space>
        </n-space>

        <n-grid :cols="1" :x-gap="12" :y-gap="12">
          <template v-for="item in results" :key="item.id">
            <n-gi v-if="item.poster_urls?.length || item.backdrop_urls?.length">
              <n-card
                size="small"
                hoverable
                style="position: relative; overflow: hidden; padding: 0"
              >
                <n-button
                  size="tiny"
                  style="position: absolute; top: 8px; right: 8px; z-index: 10"
                  @click="openVideosModal(item)"
                >
                  查找预告片
                </n-button>

                <div style="padding: 12px">
                  <!-- 标题 -->
                  <n-ellipsis :line-clamp="1" :tooltip="{ width: 300 }">
                    <strong style="font-size: 14px">{{ item.title }}</strong>
                  </n-ellipsis>
                  <n-text depth="3" style="font-size: 12px; display: block; margin-top: 3px">{{
                    item.release_date || '未知'
                  }}</n-text>

                  <!-- 海报和背景横向滚动 -->
                  <div
                    style="overflow-x: auto; overflow-y: hidden; margin-top: 10px; height: 200px"
                  >
                    <div style="display: flex; gap: 8px; height: 100%; min-width: min-content">
                      <!-- 海报 -->
                      <div
                        v-for="(url, idx) in item.poster_urls?.slice(0, 6)"
                        :key="`poster-${idx}`"
                        style="flex: 0 0 60px"
                      >
                        <div class="poster-thumb" @click="copyUrl(url, '海报')">
                          <img
                            :src="url"
                            style="width: 100%; height: 100%; object-fit: cover"
                            @error="
                              (e: Event) => ((e.target as HTMLImageElement).style.display = 'none')
                            "
                          />
                          <div class="thumb-overlay">
                            <n-button size="tiny" @click.stop="copyUrl(url, '海报')">复制</n-button>
                          </div>
                        </div>
                      </div>

                      <!-- 背景 -->
                      <div
                        v-for="(url, idx) in item.backdrop_urls?.slice(0, 5)"
                        :key="`backdrop-${idx}`"
                        style="flex: 0 0 280px"
                      >
                        <div class="backdrop-thumb-fixed" @click="openBackdropSizeModal(url)">
                          <img
                            :src="url"
                            style="width: 100%; height: 100%; object-fit: cover"
                            @error="
                              (e: Event) => ((e.target as HTMLImageElement).style.display = 'none')
                            "
                          />
                          <div class="thumb-overlay">
                            <n-button size="tiny" @click.stop="openBackdropSizeModal(url)"
                              >复制</n-button
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </n-card>
            </n-gi>
          </template>
        </n-grid>
      </template>

      <template v-else-if="searched && !searching">
        <n-empty description="未找到相关内容，请尝试其他关键词" />
      </template>
    </n-card>

    <!-- 背景尺寸选择弹窗 -->
    <n-modal
      v-model:show="showSizeModal"
      preset="card"
      title="选择背景尺寸"
      style="max-width: 400px"
    >
      <n-space vertical>
        <n-button
          v-for="opt in backdropSizeOptions"
          :key="opt.value"
          block
          @click="copyBackdropWithSize(opt.value)"
        >
          {{ opt.label }}
        </n-button>
      </n-space>
    </n-modal>

    <!-- 预告片弹窗 -->
    <n-modal
      v-model:show="showVideosModal"
      preset="card"
      title="预告片列表"
      style="max-width: 1200px"
    >
      <div v-if="!videosList.length" style="text-align: center; padding: 20px; color: #999">
        暂无预告片
      </div>
      <div v-else style="display: flex; flex-wrap: wrap; gap: 12px">
        <div v-for="v in videosList" :key="v.key" style="flex: 0 1 auto; min-width: 280px">
          <div style="margin-bottom: 6px">
            <div
              style="
                font-weight: 500;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 13px;
              "
            >
              {{ v.name }}
            </div>
            <div style="font-size: 11px; color: #999">{{ v.type }} · {{ v.site }}</div>
          </div>
          <div
            style="
              width: 100%;
              height: 160px;
              margin-bottom: 6px;
              border-radius: 4px;
              overflow: hidden;
            "
          >
            <iframe
              :src="
                v.url.replace('watch?v=', 'embed/').replace('vimeo.com/', 'player.vimeo.com/video/')
              "
              style="width: 100%; height: 100%; border: none"
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
          <n-space size="small">
            <n-button size="tiny" @click="copyUrl(v.url, '预告片')">复制</n-button>
            <n-button size="tiny" tag="a" :href="v.url" target="_blank">打开</n-button>
          </n-space>
        </div>
      </div>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { ref } from 'vue';
import { http } from '../../../lib/http';

type PosterItem = {
  id: number;
  title: string;
  original_title: string;
  poster_path: string;
  poster_url?: string;
  poster_paths?: string[];
  poster_urls?: string[];
  backdrop_path?: string;
  backdrop_url?: string;
  backdrop_paths?: string[];
  backdrop_urls?: string[];
  release_date?: string;
  overview?: string;
  vote_average?: number;
  media_type: 'movie' | 'tv';
};

const msg = useMessage();
const keyword = ref('');
const searchType = ref('multi');
const searching = ref(false);
const searched = ref(false);
const results = ref<PosterItem[]>([]);
const total = ref(0);
const page = ref(1);
const totalPages = ref(0);
const showModal = ref(false);
const currentItem = ref<PosterItem | null>(null);
const showSizeModal = ref(false);
const pendingBackdropPath = ref('');
const showVideosModal = ref(false);
const loadingVideos = ref(false);
const videosList = ref<{ key: string; name: string; site: string; type: string; url: string }[]>(
  []
);

const typeOptions = [
  { label: '全部', value: 'multi' },
  { label: '电影', value: 'movie' },
  { label: '电视剧', value: 'tv' },
];

const backdropSizeOptions = [
  { label: 'w780 (780px)', value: 'w780' },
  { label: 'w1280 (1280px)', value: 'w1280' },
  { label: 'w1920 (1920px)', value: 'w1920' },
  { label: 'original (原图)', value: 'original' },
];

async function search(p = 1) {
  const kw = keyword.value.trim();
  if (!kw) {
    msg.warning('请输入搜索关键词');
    return;
  }
  searching.value = true;
  searched.value = true;
  try {
    const res = await http.get('/admin/poster/search', {
      params: { keyword: kw, type: searchType.value, page: p },
    });
    results.value = (res.data?.results || []) as PosterItem[];
    total.value = res.data?.total || 0;
    page.value = res.data?.page || 1;
    totalPages.value = res.data?.totalPages || 0;
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.message || '搜索失败';
    msg.error(String(errMsg));
    results.value = [];
  } finally {
    searching.value = false;
  }
}

function goPage(p: number) {
  search(p);
}

function showDetail(item: PosterItem) {
  currentItem.value = item;
  showModal.value = true;
}

async function copyUrl(url: string, type: string) {
  if (!url) {
    msg.warning(`无${type}链接`);
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    msg.success(`${type}链接已复制`);
  } catch {
    msg.error('复制失败，请手动复制');
  }
}

function openBackdropSizeModal(backdropPath: string) {
  if (!backdropPath) {
    msg.warning('无背景链接');
    return;
  }
  // 从完整URL中提取路径部分
  const path = backdropPath.includes('/t/p/')
    ? backdropPath.split('/t/p/')[1].replace(/^[^/]*/, '')
    : backdropPath;
  pendingBackdropPath.value = path;
  showSizeModal.value = true;
}

async function copyBackdropWithSize(size: string) {
  const url = `https://image.tmdb.org/t/p/${size}${pendingBackdropPath.value}`;
  showSizeModal.value = false;
  try {
    await navigator.clipboard.writeText(url);
    msg.success('背景链接已复制');
  } catch {
    msg.error('复制失败，请手动复制');
  }
}

async function openVideosModal(item: PosterItem) {
  showVideosModal.value = true;
  loadingVideos.value = true;
  videosList.value = [];
  try {
    const res = await http.get('/admin/poster/videos', {
      params: { id: item.id, type: item.media_type },
    });
    videosList.value = Array.isArray(res.data) ? res.data : [];
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '获取预告片失败'));
  } finally {
    loadingVideos.value = false;
  }
}
</script>

<style scoped>
.poster-thumb {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.backdrop-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.backdrop-thumb-fixed {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.poster-thumb:hover .thumb-overlay,
.backdrop-thumb:hover .thumb-overlay,
.backdrop-thumb-fixed:hover .thumb-overlay {
  opacity: 1;
}
</style>
