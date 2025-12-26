<template>
  <n-space vertical size="large">
    <n-card title="欢迎使用 937 CMS">
      <n-space vertical>
        <n-text>这里是后台管理控制台（Vue + Naive UI）。</n-text>
        <n-text depth="3">建议先完成系统初始化，再配置采集源/采集任务。</n-text>
      </n-space>
    </n-card>

    <!-- 统计卡片 -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.vods.total
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">总视频数</n-text>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.vods.todayNew
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">今日新增</n-text>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.vods.todayUpdated
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">今日更新</n-text>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.types.total
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">分类总数</n-text>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 播放和收藏统计 -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.plays.today
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">今日播放量</n-text>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          :bordered="false"
          style="background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)"
        >
          <n-space vertical align="center">
            <n-text style="color: white; font-size: 28px; font-weight: bold">{{
              stats.favorites.total
            }}</n-text>
            <n-text style="color: rgba(255, 255, 255, 0.8); font-size: 14px">总收藏数</n-text>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 图表区域 -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <n-gi>
        <n-card title="最近7天播放趋势">
          <div ref="playTrendChart" style="width: 100%; height: 300px"></div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="最近7天采集统计">
          <div ref="collectStatsChart" style="width: 100%; height: 300px"></div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 快速导航 -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="采集">
          <n-space vertical>
            <n-text>统一采集配置：关键词过滤、同义词、合并规则</n-text>
            <n-button secondary @click="$router.push('/collect/settings')">去配置</n-button>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="内容">
          <n-space vertical>
            <n-text>分类管理：树状结构选择上级</n-text>
            <n-button secondary @click="$router.push('/content/types')">去管理</n-button>
          </n-space>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="系统">
          <n-space vertical>
            <n-text>站外入库密码（系统随机生成，可在后台修改）</n-text>
            <n-button secondary @click="$router.push('/system')">去查看</n-button>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as echarts from 'echarts';
import { http } from '../../lib/http';

type Stats = {
  vods: { total: number; todayNew: number; todayUpdated: number };
  types: { total: number };
  plays: { today: number; trend: any[] };
  users: { total: number; todayActive: number };
  favorites: { total: number };
  collects: any[];
};

const stats = ref<Stats>({
  vods: { total: 0, todayNew: 0, todayUpdated: 0 },
  types: { total: 0 },
  plays: { today: 0, trend: [] },
  users: { total: 0, todayActive: 0 },
  favorites: { total: 0 },
  collects: [],
});

const playTrendChart = ref<HTMLElement>();
const collectStatsChart = ref<HTMLElement>();

async function loadStats() {
  try {
    const res = await http.get('/admin/dashboard/stats');
    stats.value = res.data;
    renderPlayTrendChart();
    renderCollectStatsChart();
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

function renderPlayTrendChart() {
  if (!playTrendChart.value) return;

  const chart = echarts.init(playTrendChart.value);
  const trend = stats.value.plays.trend || [];

  const dates = trend.map((item: any) => item.date).reverse();
  const counts = trend.map((item: any) => item.count).reverse();

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: counts,
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#667eea',
        },
        areaStyle: {
          color: 'rgba(102, 126, 234, 0.1)',
        },
      },
    ],
  };

  chart.setOption(option);
}

function renderCollectStatsChart() {
  if (!collectStatsChart.value) return;

  const chart = echarts.init(collectStatsChart.value);
  const collects = stats.value.collects || [];

  const statusMap: { [key: number]: string } = { 0: '待执行', 1: '执行中', 2: '完成', 3: '失败' };
  const data = collects.map((item: any) => ({
    name: statusMap[item.status] || `状态${item.status}`,
    value: item.count || 0,
  }));

  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '采集任务',
        type: 'pie',
        radius: '50%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  chart.setOption(option);
}

onMounted(() => {
  loadStats();
});
</script>
