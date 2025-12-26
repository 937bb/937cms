<template>
  <n-space vertical size="large">
    <n-card :title="filterPreset ? `视频管理 - ${filterPreset}` : '视频管理'">
      <!-- 筛选栏 -->
      <n-space align="center" wrap style="margin-bottom: 12px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索片名"
          style="width: 240px"
          clearable
        />
        <n-tree-select
          v-model:value="filters.typeId"
          :options="typeTreeOptions"
          clearable
          placeholder="分类"
          style="min-width: 260px"
        />
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          style="width: 120px"
        />
        <n-button secondary :loading="loading" @click="load">查询</n-button>
      </n-space>

      <!-- 批量操作栏 -->
      <n-space style="margin-bottom: 12px">
        <n-button :disabled="selectedIds.length === 0" @click="batchEnable">批量上架</n-button>
        <n-button :disabled="selectedIds.length === 0" @click="batchDisable">批量下架</n-button>
        <n-popconfirm @positive-click="batchDelete">
          <template #trigger>
            <n-button type="error" :disabled="selectedIds.length === 0">批量删除</n-button>
          </template>
          确认删除选中的 {{ selectedIds.length }} 个视频？
        </n-popconfirm>
      </n-space>

      <n-data-table
        remote
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: VodRow) => row.vod_id"
        @update:checked-row-keys="handleCheck"
      />
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        title="编辑视频"
        closable
        style="width: 96vw; max-width: 1600px; height: 86vh; display: flex; flex-direction: column"
        :content-style="{ flex: '1', minHeight: '0', overflow: 'auto', paddingRight: '8px' }"
        @close="showModal = false"
      >
        <n-tabs type="line" animated>
          <n-tab-pane name="basic" tab="基本">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-grid :cols="2" :x-gap="12" :y-gap="12">
                <n-gi>
                  <n-form-item label="视频ID">
                    <n-input :value="String(form.vod_id || '')" disabled />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="会员组ID">
                    <n-input-number v-model:value="form.group_id" :min="0" :max="9999" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="片名">
                    <n-input v-model:value="form.vod_name" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="副标题">
                    <n-input v-model:value="form.vod_sub" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="英文名">
                    <n-input v-model:value="form.vod_en" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="分类">
                    <n-tree-select
                      v-model:value="form.type_id"
                      :options="typeTreeOptions"
                      placeholder="请选择分类"
                    />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="状态">
                    <n-radio-group v-model:value="form.vod_status">
                      <n-radio :value="1">上架</n-radio>
                      <n-radio :value="0">下架</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="推荐等级">
                    <n-input-number v-model:value="form.vod_level" :min="0" :max="9" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="完结">
                    <n-radio-group v-model:value="form.vod_isend">
                      <n-radio :value="0">连载</n-radio>
                      <n-radio :value="1">完结</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="锁定/版权">
                    <n-space>
                      <n-switch
                        v-model:value="form.vod_lock"
                        :checked-value="1"
                        :unchecked-value="0"
                      />
                      <n-switch
                        v-model:value="form.vod_copyright"
                        :checked-value="1"
                        :unchecked-value="0"
                      />
                    </n-space>
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="地区">
                    <n-input v-model:value="form.vod_area" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="语言">
                    <n-input v-model:value="form.vod_lang" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="年份">
                    <n-input v-model:value="form.vod_year" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="上映日期">
                    <n-input v-model:value="form.vod_pubdate" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="版本/状态">
                    <n-input v-model:value="form.vod_version" placeholder="例如：HD/4K" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="连载状态">
                    <n-input v-model:value="form.vod_state" placeholder="例如：更新至xx集" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="标签/类型">
                    <n-input v-model:value="form.vod_tag" placeholder="多个用逗号分隔" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_class" placeholder="类型（class）" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="字母">
                    <n-input v-model:value="form.vod_letter" placeholder="A-Z" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="颜色">
                    <n-input v-model:value="form.vod_color" placeholder="hex(不含#)" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="备注">
                    <n-input v-model:value="form.vod_remarks" placeholder="例如：更新至xx集" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="简介">
                    <n-input
                      v-model:value="form.vod_content"
                      type="textarea"
                      :autosize="{ minRows: 4, maxRows: 10 }"
                    />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="一句话简介">
                    <n-input v-model:value="form.vod_blurb" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="people" tab="人员">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-form-item label="主演">
                <n-input v-model:value="form.vod_actor" placeholder="多个用逗号分隔" />
              </n-form-item>
              <n-form-item label="导演">
                <n-input v-model:value="form.vod_director" placeholder="多个用逗号分隔" />
              </n-form-item>
              <n-form-item label="编剧">
                <n-input v-model:value="form.vod_writer" />
              </n-form-item>
              <n-form-item label="幕后">
                <n-input v-model:value="form.vod_behind" />
              </n-form-item>
              <n-form-item label="作者">
                <n-input v-model:value="form.vod_author" />
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="images" tab="图片">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-form-item label="封面图">
                <UploadInput v-model="form.vod_pic" dir="vod" />
              </n-form-item>
              <n-form-item label="缩略图">
                <UploadInput v-model="form.vod_pic_thumb" dir="vod" />
              </n-form-item>
              <n-form-item label="幻灯图">
                <UploadInput v-model="form.vod_pic_slide" dir="vod" />
              </n-form-item>
              <n-form-item label="截图(文本)">
                <n-input
                  v-model:value="form.vod_pic_screenshot"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 10 }"
                />
                <template #feedback
                  >可填多张图片地址，格式按 MacCMS 约定（如用换行/分隔符）。</template
                >
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="play" tab="播放">
            <div style="padding: 12px 0">
              <div
                v-if="!form.playList || form.playList.length === 0"
                style="color: #999; text-align: center; padding: 40px 0"
              >
                暂无播放源
              </div>
              <div v-else>
                <div
                  v-for="(source, idx) in form.playList"
                  :key="idx"
                  style="
                    margin-bottom: 24px;
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                  "
                >
                  <div style="font-weight: 500; margin-bottom: 12px">{{ source.playerName }}</div>
                  <div
                    v-if="!source.episodes || source.episodes.length === 0"
                    style="color: #999; padding: 12px 0"
                  >
                    暂无剧集
                  </div>
                  <div
                    v-else
                    style="
                      max-height: 200px;
                      overflow-y: auto;
                      border: 1px solid #f0f0f0;
                      border-radius: 2px;
                      padding: 8px;
                    "
                  >
                    <div
                      style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 8px;
                      "
                    >
                      <div
                        v-for="(ep, epIdx) in source.episodes"
                        :key="epIdx"
                        style="
                          padding: 8px;
                          background: #f5f5f5;
                          border-radius: 2px;
                          font-size: 12px;
                          cursor: pointer;
                          transition: background 0.2s;
                        "
                        @click="
                          editingEpisode = { ...ep, sourceIdx: idx, epIdx };
                          showEpisodeEdit = true;
                        "
                        @mouseenter="$event.target.style.background = '#e8e8e8'"
                        @mouseleave="$event.target.style.background = '#f5f5f5'"
                      >
                        <div style="font-weight: 500">第{{ ep.num }}集</div>
                        <div style="color: #666; margin-top: 4px; word-break: break-all">
                          {{ ep.title || ep.url }}
                        </div>
                      </div>
                      <div
                        style="
                          padding: 8px;
                          background: #f0f0f0;
                          border-radius: 2px;
                          font-size: 12px;
                          cursor: pointer;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          transition: background 0.2s;
                        "
                        @click="addEpisode(idx)"
                        @mouseenter="$event.target.style.background = '#e0e0e0'"
                        @mouseleave="$event.target.style.background = '#f0f0f0'"
                      >
                        <span style="color: #666">+ 添加集</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <n-form
                :model="form"
                label-placement="left"
                label-width="130"
                style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb"
              >
                <n-form-item label="点播积分">
                  <n-input-number v-model:value="form.vod_points_play" :min="0" :max="99999" />
                </n-form-item>
              </n-form>
            </div>
          </n-tab-pane>

          <n-tab-pane name="down" tab="下载">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-form-item label="下载组(from)">
                <n-input v-model:value="form.vod_down_from" placeholder="多个用$$$分隔" />
              </n-form-item>
              <n-form-item label="下载组(server)">
                <n-input v-model:value="form.vod_down_server" placeholder="多个用$$$分隔" />
              </n-form-item>
              <n-form-item label="下载组(note)">
                <n-input v-model:value="form.vod_down_note" placeholder="多个用$$$分隔" />
              </n-form-item>
              <n-form-item label="下载地址(url)">
                <n-input
                  v-model:value="form.vod_down_url"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 16 }"
                />
              </n-form-item>
              <n-form-item label="下载积分">
                <n-input-number v-model:value="form.vod_points_down" :min="0" :max="99999" />
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="advanced" tab="更多">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-grid :cols="2" :x-gap="12" :y-gap="12">
                <n-gi>
                  <n-form-item label="积分">
                    <n-input-number v-model:value="form.vod_points" :min="0" :max="99999" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="总集数">
                    <n-input-number v-model:value="form.vod_total" :min="0" :max="99999" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="连载标识">
                    <n-input v-model:value="form.vod_serial" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="电视台">
                    <n-input v-model:value="form.vod_tv" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="周几更新">
                    <n-input v-model:value="form.vod_weekday" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="时长">
                    <n-input v-model:value="form.vod_duration" placeholder="例如：45" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="试看(秒)">
                    <n-input-number v-model:value="form.vod_trysee" :min="0" :max="99999" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="点击">
                    <n-input-number v-model:value="form.vod_hits" :min="0" :max="1_000_000_000" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="日/周/月点击">
                    <n-input-number
                      v-model:value="form.vod_hits_day"
                      :min="0"
                      :max="1_000_000_000"
                    />
                    <div style="width: 8px" />
                    <n-input-number
                      v-model:value="form.vod_hits_week"
                      :min="0"
                      :max="1_000_000_000"
                    />
                    <div style="width: 8px" />
                    <n-input-number
                      v-model:value="form.vod_hits_month"
                      :min="0"
                      :max="1_000_000_000"
                    />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="顶/踩">
                    <n-input-number v-model:value="form.vod_up" :min="0" :max="1_000_000_000" />
                    <div style="width: 8px" />
                    <n-input-number v-model:value="form.vod_down" :min="0" :max="1_000_000_000" />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="评分">
                    <n-input-number v-model:value="form.vod_score" :min="0" :max="10" :step="0.1" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="评分总/人数">
                    <n-input-number
                      v-model:value="form.vod_score_all"
                      :min="0"
                      :max="1_000_000_000"
                    />
                    <div style="width: 8px" />
                    <n-input-number
                      v-model:value="form.vod_score_num"
                      :min="0"
                      :max="1_000_000_000"
                    />
                  </n-form-item>
                </n-gi>

                <n-gi>
                  <n-form-item label="豆瓣ID">
                    <n-input-number
                      v-model:value="form.vod_douban_id"
                      :min="0"
                      :max="1_000_000_000"
                    />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="豆瓣评分">
                    <n-input-number
                      v-model:value="form.vod_douban_score"
                      :min="0"
                      :max="10"
                      :step="0.1"
                    />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="关联(视频/资讯)">
                    <n-input v-model:value="form.vod_rel_vod" placeholder="vod_id 列表" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_rel_art" placeholder="art_id 列表" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="来源 URL">
                    <n-input v-model:value="form.vod_reurl" placeholder="vod_reurl" />
                  </n-form-item>
                </n-gi>

                <n-gi :span="2">
                  <n-form-item label="访问密码">
                    <n-input v-model:value="form.vod_pwd" placeholder="密码" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_pwd_url" placeholder="跳转URL" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="2">
                  <n-form-item label="播放/下载密码">
                    <n-input v-model:value="form.vod_pwd_play" placeholder="播放密码" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_pwd_play_url" placeholder="播放跳转URL" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_pwd_down" placeholder="下载密码" />
                    <div style="width: 8px" />
                    <n-input v-model:value="form.vod_pwd_down_url" placeholder="下载跳转URL" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="plot" tab="分集剧情">
            <n-form :model="form" label-placement="left" label-width="130">
              <n-form-item label="启用剧情">
                <n-switch v-model:value="form.vod_plot" :checked-value="1" :unchecked-value="0" />
              </n-form-item>
              <n-form-item label="剧情标题">
                <n-input
                  v-model:value="form.vod_plot_name"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 10 }"
                />
              </n-form-item>
              <n-form-item label="剧情详情">
                <n-input
                  v-model:value="form.vod_plot_detail"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 16 }"
                />
              </n-form-item>
            </n-form>
          </n-tab-pane>
        </n-tabs>

        <template #footer>
          <n-space justify="end">
            <n-button secondary @click="showModal = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="save">保存</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <n-modal v-model:show="showEpisodeEdit">
      <n-card title="编辑剧集" closable style="width: 500px" @close="showEpisodeEdit = false">
        <n-form :model="editingEpisode" label-placement="left" label-width="100">
          <n-form-item label="集数">
            <n-input-number v-model:value="editingEpisode.num" :min="1" :max="9999" />
          </n-form-item>
          <n-form-item label="标题">
            <n-input v-model:value="editingEpisode.title" placeholder="集标题" />
          </n-form-item>
          <n-form-item label="播放地址">
            <n-input
              v-model:value="editingEpisode.url"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 8 }"
              placeholder="播放地址"
            />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button secondary @click="showEpisodeEdit = false">取消</n-button>
            <n-button type="primary" @click="saveEpisode">保存</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import type {
  DataTableColumns,
  DataTableRowKey,
  PaginationProps,
  TreeSelectOption,
} from 'naive-ui';
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui';
import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '../../../lib/http';
import UploadInput from '../../components/UploadInput.vue';

const route = useRoute();

type TypeItem = { type_id: number; type_name: string; type_pid: number; type_sort: number };

type VodRow = {
  vod_id: number;
  vod_name: string;
  type_id: number;
  type_name: string;
  vod_pic: string;
  vod_remarks: string;
  vod_year: string;
  vod_area: string;
  vod_time_add: number;
  vod_status: number;
};

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const showEpisodeEdit = ref(false);
const editingEpisode = ref<any>({});

const items = ref<VodRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const selectedIds = ref<number[]>([]);

const types = ref<TypeItem[]>([]);

const filters = reactive<{
  keyword: string;
  typeId: number | null;
  status: number | null;
  lock: number | null;
  url: string;
  points: string;
  plot: number | null;
}>({
  keyword: '',
  typeId: null,
  status: null,
  lock: null,
  url: '',
  points: '',
  plot: null,
});

// 从路由参数初始化筛选条件
function initFiltersFromRoute() {
  const q = route.query;
  if (q.filter === 'nourl')
    filters.url = '0'; // 0=无地址
  else if (q.filter === 'locked') filters.lock = 1;
  else if (q.filter === 'pending') filters.status = 0;
  else if (q.filter === 'points') filters.points = '1';
  else if (q.filter === 'plot') filters.plot = 1;

  // 处理直接传递的参数
  if (q.url) filters.url = String(q.url);
  if (q.keyword) filters.keyword = String(q.keyword);
  if (q.typeId) filters.typeId = Number(q.typeId);
  if (q.status !== undefined) filters.status = Number(q.status);
  if (q.lock !== undefined) filters.lock = Number(q.lock);
  if (q.points) filters.points = String(q.points);
  if (q.plot !== undefined) filters.plot = Number(q.plot);
}

const filterPreset = computed(() => {
  const q = route.query.filter;
  if (q === 'nourl') return '无地址视频';
  if (q === 'locked') return '已锁定视频';
  if (q === 'pending') return '未审核视频';
  if (q === 'points') return '需积分视频';
  if (q === 'plot') return '有分集剧情';
  return '';
});

const statusOptions = [
  { label: '上架', value: 1 },
  { label: '下架', value: 0 },
];

function buildTypeTreeOptions(list: TypeItem[]): TreeSelectOption[] {
  const byPid = new Map<number, TypeItem[]>();
  for (const t of list) {
    const pid = Number(t.type_pid || 0);
    byPid.set(pid, [...(byPid.get(pid) || []), t]);
  }
  const sortChildren = (arr: TypeItem[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          Number(a.type_sort || 0) - Number(b.type_sort || 0) ||
          Number(a.type_id) - Number(b.type_id)
      );
  const walk = (pid: number): TreeSelectOption[] => {
    const children = sortChildren(byPid.get(pid) || []);
    return children.map((c) => ({ label: c.type_name, key: c.type_id, children: walk(c.type_id) }));
  };
  return walk(0);
}

const typeTreeOptions = computed(() => buildTypeTreeOptions(types.value));

const pagination = computed<PaginationProps>(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onUpdatePage: (p: number) => {
    page.value = p;
    load().catch(() => void 0);
  },
  onUpdatePageSize: (s: number) => {
    pageSize.value = s;
    page.value = 1;
    load().catch(() => void 0);
  },
}));

const form = reactive<any>({
  vod_id: 0,
  group_id: 0,
  vod_name: '',
  vod_sub: '',
  vod_en: '',
  type_id: 0,
  vod_pic: '',
  vod_remarks: '',
  vod_pic_thumb: '',
  vod_pic_slide: '',
  vod_pic_screenshot: '',
  vod_letter: '',
  vod_color: '',
  vod_tag: '',
  vod_class: '',
  vod_actor: '',
  vod_director: '',
  vod_writer: '',
  vod_behind: '',
  vod_blurb: '',
  vod_pubdate: '',
  vod_total: 0,
  vod_serial: '0',
  vod_tv: '',
  vod_weekday: '',
  vod_area: '',
  vod_lang: '',
  vod_year: '',
  vod_version: '',
  vod_state: '',
  vod_author: '',
  vod_jumpurl: '',
  vod_tpl: '',
  vod_tpl_play: '',
  vod_tpl_down: '',
  vod_content: '',
  vod_down_from: '',
  vod_down_server: '',
  vod_down_note: '',
  vod_down_url: '',
  vod_plot: 0,
  vod_plot_name: '',
  vod_plot_detail: '',
  vod_status: 1,
  vod_level: 0,
  vod_isend: 0,
  vod_lock: 0,
  vod_copyright: 0,
  vod_points: 0,
  vod_points_play: 0,
  vod_points_down: 0,
  vod_hits: 0,
  vod_hits_day: 0,
  vod_hits_week: 0,
  vod_hits_month: 0,
  vod_up: 0,
  vod_down: 0,
  vod_duration: '',
  vod_trysee: 0,
  vod_score: 0,
  vod_score_all: 0,
  vod_score_num: 0,
  vod_douban_id: 0,
  vod_douban_score: 0,
  vod_reurl: '',
  vod_rel_vod: '',
  vod_rel_art: '',
  vod_pwd: '',
  vod_pwd_url: '',
  vod_pwd_play: '',
  vod_pwd_play_url: '',
  vod_pwd_down: '',
  vod_pwd_down_url: '',
  playList: [],
});

async function loadTypes() {
  const res = await http.get('/admin/types');
  types.value = (res.data?.items || []) as TypeItem[];
}

async function load() {
  loading.value = true;
  try {
    await loadTypes();
    const res = await http.get('/admin/vods', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: filters.keyword || undefined,
        typeId: filters.typeId ?? undefined,
        status: filters.status ?? undefined,
        lock: filters.lock ?? undefined,
        url: filters.url || undefined,
        points: filters.points || undefined,
        plot: filters.plot ?? undefined,
      },
    });
    items.value = (res.data?.items || []) as VodRow[];
    total.value = Number(res.data?.total || 0);
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function openEdit(vodId: number) {
  try {
    isInitializing = true;
    const res = await http.get(`/admin/vods/detail/${vodId}`);
    const item = res.data?.item || {};
    const playList = res.data?.playList || [];
    Object.assign(form, {
      vod_id: Number(item.vod_id || 0),
      group_id: Number(item.group_id || 0),
      vod_name: String(item.vod_name || ''),
      vod_sub: String(item.vod_sub || ''),
      vod_en: String(item.vod_en || ''),
      type_id: Number(item.type_id || 0),
      vod_pic: String(item.vod_pic || ''),
      vod_remarks: String(item.vod_remarks || ''),
      vod_pic_thumb: String(item.vod_pic_thumb || ''),
      vod_pic_slide: String(item.vod_pic_slide || ''),
      vod_pic_screenshot: String(item.vod_pic_screenshot || ''),
      vod_letter: String(item.vod_letter || ''),
      vod_color: String(item.vod_color || ''),
      vod_tag: String(item.vod_tag || ''),
      vod_class: String(item.vod_class || ''),
      vod_actor: String(item.vod_actor || ''),
      vod_director: String(item.vod_director || ''),
      vod_writer: String(item.vod_writer || ''),
      vod_behind: String(item.vod_behind || ''),
      vod_blurb: String(item.vod_blurb || ''),
      vod_pubdate: String(item.vod_pubdate || ''),
      vod_total: Number(item.vod_total || 0),
      vod_serial: String(item.vod_serial || '0'),
      vod_tv: String(item.vod_tv || ''),
      vod_weekday: String(item.vod_weekday || ''),
      vod_area: String(item.vod_area || ''),
      vod_lang: String(item.vod_lang || ''),
      vod_year: String(item.vod_year || ''),
      vod_version: String(item.vod_version || ''),
      vod_state: String(item.vod_state || ''),
      vod_author: String(item.vod_author || ''),
      vod_jumpurl: String(item.vod_jumpurl || ''),
      vod_tpl: String(item.vod_tpl || ''),
      vod_tpl_play: String(item.vod_tpl_play || ''),
      vod_tpl_down: String(item.vod_tpl_down || ''),
      vod_content: String(item.vod_content || ''),
      vod_down_from: String(item.vod_down_from || ''),
      vod_down_server: String(item.vod_down_server || ''),
      vod_down_note: String(item.vod_down_note || ''),
      vod_down_url: String(item.vod_down_url || ''),
      vod_plot: Number(item.vod_plot || 0) ? 1 : 0,
      vod_plot_name: String(item.vod_plot_name || ''),
      vod_plot_detail: String(item.vod_plot_detail || ''),
      vod_status: Number(item.vod_status) ? 1 : 0,
      vod_level: Number(item.vod_level || 0),
      vod_isend: Number(item.vod_isend || 0) ? 1 : 0,
      vod_lock: Number(item.vod_lock || 0) ? 1 : 0,
      vod_copyright: Number(item.vod_copyright || 0) ? 1 : 0,
      vod_points: Number(item.vod_points || 0),
      vod_points_play: Number(item.vod_points_play || 0),
      vod_points_down: Number(item.vod_points_down || 0),
      vod_hits: Number(item.vod_hits || 0),
      vod_hits_day: Number(item.vod_hits_day || 0),
      vod_hits_week: Number(item.vod_hits_week || 0),
      vod_hits_month: Number(item.vod_hits_month || 0),
      vod_up: Number(item.vod_up || 0),
      vod_down: Number(item.vod_down || 0),
      vod_duration: String(item.vod_duration || ''),
      vod_trysee: Number(item.vod_trysee || 0),
      vod_score: Number(item.vod_score || 0),
      vod_score_all: Number(item.vod_score_all || 0),
      vod_score_num: Number(item.vod_score_num || 0),
      vod_douban_id: Number(item.vod_douban_id || 0),
      vod_douban_score: Number(item.vod_douban_score || 0),
      vod_reurl: String(item.vod_reurl || ''),
      vod_rel_vod: String(item.vod_rel_vod || ''),
      vod_rel_art: String(item.vod_rel_art || ''),
      vod_pwd: String(item.vod_pwd || ''),
      vod_pwd_url: String(item.vod_pwd_url || ''),
      vod_pwd_play: String(item.vod_pwd_play || ''),
      vod_pwd_play_url: String(item.vod_pwd_play_url || ''),
      vod_pwd_down: String(item.vod_pwd_down || ''),
      vod_pwd_down_url: String(item.vod_pwd_down_url || ''),
      playList: playList,
    });
    await nextTick();
    showModal.value = true;
    await nextTick();
    isInitializing = false;
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '加载详情失败'));
    isInitializing = false;
  }
}

async function save() {
  if (!form.vod_id) return;
  saving.value = true;
  try {
    // 保存视频基本信息
    await http.post('/admin/vods/save', form);

    // 保存剧集信息
    if (form.playList && form.playList.length > 0) {
      for (const source of form.playList) {
        if (source.episodes && source.episodes.length > 0) {
          for (const ep of source.episodes) {
            if (ep.id) {
              // 更新现有剧集
              await http
                .post(`/admin/vods/${form.vod_id}/episodes/${ep.id}`, {
                  episode_num: ep.num,
                  title: ep.title,
                  url: ep.url,
                })
                .catch(() => void 0);
            } else if (ep.url) {
              // 创建新剧集
              await http
                .post(`/admin/vods/${form.vod_id}/episodes/create`, {
                  source_id: source.id,
                  episode_num: ep.num,
                  title: ep.title,
                  url: ep.url,
                })
                .catch(() => void 0);
            }
          }
        }
      }
    }

    msg.success('保存成功');
    showModal.value = false;
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '保存失败'));
  } finally {
    saving.value = false;
  }
}

function saveEpisode() {
  if (!editingEpisode.value.sourceIdx !== undefined && editingEpisode.value.epIdx !== undefined) {
    const source = form.playList[editingEpisode.value.sourceIdx];
    if (source && source.episodes) {
      source.episodes[editingEpisode.value.epIdx] = {
        id: editingEpisode.value.id,
        num: editingEpisode.value.num,
        title: editingEpisode.value.title,
        url: editingEpisode.value.url,
      };
    }
  }
  showEpisodeEdit.value = false;
}

function addEpisode(sourceIdx: number) {
  const source = form.playList[sourceIdx];
  if (source && source.episodes) {
    const maxNum = Math.max(...source.episodes.map((ep: any) => ep.num || 0), 0);
    source.episodes.push({
      num: maxNum + 1,
      title: '',
      url: '',
      sort: source.episodes.length,
    });
  }
}

async function remove(vodId: number) {
  try {
    await http.post('/admin/vods/delete', { vod_id: vodId });
    msg.success('已删除');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '删除失败'));
  }
}

// 处理选中
function handleCheck(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[];
}

// 批量上架
async function batchEnable() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/vods/batch-update-field', {
      ids: selectedIds.value,
      field: 'vod_status',
      value: 1,
    });
    msg.success('批量上架成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量下架
async function batchDisable() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/vods/batch-update-field', {
      ids: selectedIds.value,
      field: 'vod_status',
      value: 0,
    });
    msg.success('批量下架成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

// 批量删除
async function batchDelete() {
  if (selectedIds.value.length === 0) return;
  try {
    await http.post('/admin/vods/batch-delete', { ids: selectedIds.value });
    msg.success('批量删除成功');
    await load();
  } catch (e: any) {
    msg.error(String(e?.response?.data?.message || e?.message || '操作失败'));
  }
}

function statusTag(status: number) {
  return Number(status)
    ? h(NTag, { type: 'success', size: 'small' }, { default: () => '上架' })
    : h(NTag, { type: 'default', size: 'small' }, { default: () => '下架' });
}

const columns: DataTableColumns<VodRow> = [
  { type: 'selection' },
  { title: 'ID', key: 'vod_id', width: 90 },
  { title: '片名', key: 'vod_name', minWidth: 220 },
  {
    title: '分类',
    key: 'type_name',
    width: 160,
    render: (r) => `${r.type_id} - ${r.type_name || ''}`,
  },
  { title: '备注', key: 'vod_remarks', width: 140 },
  { title: '状态', key: 'vod_status', width: 90, render: (r) => statusTag(Number(r.vod_status)) },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h('div', { style: 'display:flex; gap:8px;' }, [
        h(
          NButton,
          { size: 'small', tertiary: true, onClick: () => openEdit(row.vod_id) },
          { default: () => '编辑' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => remove(row.vod_id) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', tertiary: true, type: 'error' },
                { default: () => '删除' }
              ),
            default: () => '确认删除该视频？',
          }
        ),
      ]),
  },
];

// 监听分类变化，自动保存（仅在弹窗打开后的用户手动改变时）
let typeIdChangeTimer: any;
let isInitializing = false;
watch(
  () => form.type_id,
  () => {
    if (isInitializing) return;
    if (!form.vod_id || !showModal.value) return;
    clearTimeout(typeIdChangeTimer);
    typeIdChangeTimer = setTimeout(() => {
      save().catch(() => void 0);
    }, 500);
  }
);

// 监听路由变化，重新初始化筛选条件
watch(
  () => route.query.filter,
  async () => {
    // 重置筛选条件
    filters.keyword = '';
    filters.typeId = null;
    filters.status = null;
    filters.lock = null;
    filters.url = '';
    filters.points = '';
    filters.plot = null;
    page.value = 1;
    initFiltersFromRoute();
    await load();
  },
  { immediate: true }
);

onMounted(() => {
  // 初始化已在 watch 中处理
});
</script>
