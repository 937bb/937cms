<template>
  <n-space vertical size="large">
    <n-card title="Mxpro 模板配置">
      <template #header-extra>
        <n-button @click="$router.push('/themes')">返回列表</n-button>
      </template>

      <NSpin :show="loading">
        <NTabs type="line">
          <NTabPane name="base" tab="基础配置">
            <n-form label-placement="left" label-width="140">
              <n-divider title-placement="left">基础信息</n-divider>
              <n-form-item label="LOGO(浅色)">
                <UploadInput
                  v-model="config.logoLight"
                  dir="theme"
                  placeholder="留空使用系统配置"
                />
              </n-form-item>
              <n-form-item label="LOGO(深色)">
                <UploadInput v-model="config.logoDark" dir="theme" placeholder="留空使用系统配置" />
              </n-form-item>
              <n-form-item label="Favicon">
                <UploadInput
                  v-model="config.favicon"
                  dir="icon"
                  accept="image/*,.ico"
                  placeholder="留空使用 /favicon.ico"
                />
              </n-form-item>
              <n-form-item label="加载占位图">
                <UploadInput
                  v-model="config.loadingPic"
                  dir="theme"
                  accept="image/*"
                  placeholder="/mxpro/images/load.gif"
                />
              </n-form-item>
              <n-form-item label="搜索占位词">
                <n-input v-model:value="config.searchPlaceholder" placeholder="留空使用系统配置" />
              </n-form-item>
              <n-form-item label="页脚后缀">
                <n-input
                  v-model:value="config.footerSuffix"
                  placeholder="显示在站点名称后面的文字（可选）"
                />
              </n-form-item>
            </n-form>
          </NTabPane>

          <NTabPane name="nav" tab="导航菜单">
            <NTabs type="segment" animated>
              <NTabPane name="nav-basic" tab="基础">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">导航基础</n-divider>
                  <n-form-item label="新窗口打开">
                    <n-switch v-model:value="config.navTargetBlank" />
                  </n-form-item>
                  <n-form-item label="移动端导航样式">
                    <n-switch v-model:value="config.navThemeOpen" />
                    <n-text depth="3" style="margin-left: 12px">开启后移动端默认展开导航</n-text>
                  </n-form-item>
                  <n-form-item label="默认主题">
                    <n-radio-group v-model:value="config.navDefaultTheme">
                      <n-radio value="white">浅色</n-radio>
                      <n-radio value="black">深色</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <n-form-item label="全局开关">
                    <n-space>
                      <n-switch v-model:value="config.fixedGroupEnabled" />
                      <n-text>右下角浮动</n-text>
                      <n-switch v-model:value="config.fixedGroupThemeToggle" />
                      <n-text>主题切换</n-text> <n-switch v-model:value="config.fixedGroupGbook" />
                      <n-text>留言</n-text> <n-switch v-model:value="config.fixedGroupRetop" />
                      <n-text>回到顶部</n-text>
                    </n-space>
                  </n-form-item>
                  <n-form-item label="搜索提示校验">
                    <n-switch v-model:value="config.searchTips" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="nav-menu" tab="菜单">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">导航菜单</n-divider>
                  <n-form-item label="分类ID列表">
                    <n-input v-model:value="config.navTypeIds" placeholder="parent 或 1,2,3" />
                  </n-form-item>
                  <n-form-item label="默认图标">
                    <n-input
                      v-model:value="config.navIconDefault"
                      placeholder="icon-jl-o"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="图标映射(1~7)">
                    <n-space vertical style="width: 100%">
                      <n-space v-for="i in 7" :key="i" align="center">
                        <n-input-number
                          v-model:value="config[`navNum${i}`]"
                          :min="0"
                          style="width: 120px"
                        />
                        <n-input
                          v-model:value="config[`navIcon${i}`]"
                          placeholder="icon-dy-o"
                          style="width: 220px"
                        />
                        <n-text depth="3">typeId → icon</n-text>
                      </n-space>
                    </n-space>
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="nav-custom" tab="自定义">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">自定义菜单</n-divider>
                  <n-form-item label="自定义1">
                    <n-space align="center">
                      <n-switch v-model:value="config.navDiy1" />
                      <n-input
                        v-model:value="config.navDiy1Name"
                        placeholder="名称"
                        style="width: 160px"
                      />
                      <n-input
                        v-model:value="config.navDiy1Url"
                        placeholder="URL"
                        style="width: 260px"
                      />
                      <n-input
                        v-model:value="config.navDiy1Icon"
                        placeholder="icon-diy"
                        style="width: 160px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="自定义2">
                    <n-space align="center">
                      <n-switch v-model:value="config.navDiy2" />
                      <n-input
                        v-model:value="config.navDiy2Name"
                        placeholder="名称"
                        style="width: 160px"
                      />
                      <n-input
                        v-model:value="config.navDiy2Url"
                        placeholder="URL"
                        style="width: 260px"
                      />
                      <n-input
                        v-model:value="config.navDiy2Icon"
                        placeholder="icon-diy"
                        style="width: 160px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="APP 菜单">
                    <n-space align="center">
                      <n-switch v-model:value="config.navApp" />
                      <n-input
                        v-model:value="config.navAppName"
                        placeholder="APP"
                        style="width: 160px"
                      />
                      <n-input
                        v-model:value="config.navAppUrl"
                        placeholder="/app"
                        style="width: 260px"
                      />
                      <n-input
                        v-model:value="config.navAppIcon"
                        placeholder="icon-phone-o"
                        style="width: 160px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="快捷入口">
                    <n-space>
                      <n-switch v-model:value="config.navTodayNew" /> <n-text>今日更新</n-text>
                      <n-switch v-model:value="config.navHot" /> <n-text>热榜</n-text>
                    </n-space>
                  </n-form-item>
                </n-form>
              </NTabPane>
            </NTabs>
          </NTabPane>

          <!-- 首页配置 -->
          <NTabPane name="home" tab="首页配置">
            <NTabs type="segment" animated>
              <NTabPane name="home-slide" tab="轮播">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">幻灯片设置</n-divider>
                  <n-form-item label="启用幻灯片">
                    <n-switch v-model:value="config.slideEnabled" />
                  </n-form-item>
                  <n-form-item label="显示竖图海报">
                    <n-switch v-model:value="config.slideBill" />
                    <n-text depth="3" style="margin-left: 12px">幻灯片右侧显示竖图海报</n-text>
                  </n-form-item>
                  <n-form-item label="推荐等级">
                    <n-input
                      v-model:value="config.slideLevel"
                      placeholder="0 或 1,2,3"
                      style="width: 200px"
                    />
                    <n-text depth="3" style="margin-left: 12px">支持多选：1,2,3；0=不限制</n-text>
                  </n-form-item>
                  <n-form-item label="展示数量">
                    <n-input-number v-model:value="config.slideCount" :min="1" :max="20" />
                  </n-form-item>
                  <n-form-item label="排序依据">
                    <n-input
                      v-model:value="config.slideBy"
                      placeholder="time"
                      style="width: 120px"
                    />
                    <n-text depth="3" style="margin-left: 12px">time/hits/score</n-text>
                  </n-form-item>
                  <n-form-item label="排列顺序">
                    <n-radio-group v-model:value="config.slideOrder">
                      <n-radio value="desc">倒序</n-radio>
                      <n-radio value="asc">正序</n-radio>
                    </n-radio-group>
                  </n-form-item>
                  <n-form-item label="副标题显示">
                    <n-switch v-model:value="config.slideSub" />
                    <n-text depth="3" style="margin-left: 12px">开启显示简介，关闭显示演员</n-text>
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="home-week" tab="周表">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">周表设置</n-divider>
                  <n-form-item label="启用周表">
                    <n-switch v-model:value="config.weekEnabled" />
                  </n-form-item>
                  <n-form-item label="模块标题">
                    <n-input v-model:value="config.weekTitle" style="width: 200px" />
                  </n-form-item>
                  <n-form-item label="视频数量">
                    <n-input-number v-model:value="config.weekCount" :min="1" :max="20" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="home-hot" tab="推荐">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">推荐模块</n-divider>
                  <n-form-item label="启用推荐">
                    <n-switch v-model:value="config.hotEnabled" />
                  </n-form-item>
                  <n-form-item label="横图封面">
                    <n-switch v-model:value="config.hotHorizontal" />
                    <n-text depth="3" style="margin-left: 12px">关闭后显示竖图封面</n-text>
                  </n-form-item>
                  <n-form-item label="模块标题">
                    <n-input v-model:value="config.hotTitle" style="width: 200px" />
                  </n-form-item>
                  <n-form-item label="推荐等级">
                    <n-input
                      v-model:value="config.hotLevel"
                      placeholder="0 或 1,2,3"
                      style="width: 200px"
                    />
                    <n-text depth="3" style="margin-left: 12px">支持多选：1,2,3；0=不限制</n-text>
                  </n-form-item>
                  <n-form-item label="视频数量">
                    <n-input-number v-model:value="config.hotCount" :min="4" :max="30" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="home-type-list" tab="分类">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">分类模块</n-divider>
                  <n-form-item label="启用分类模块">
                    <n-switch v-model:value="config.typeListEnabled" />
                  </n-form-item>
                  <n-form-item label="指定分类">
                    <n-input
                      v-model:value="config.typeListIds"
                      style="width: 200px"
                      placeholder="parent"
                    />
                    <n-text depth="3" style="margin-left: 12px">分类ID，多个用逗号分隔</n-text>
                  </n-form-item>
                  <n-form-item label="每分类数量">
                    <n-input-number v-model:value="config.typeListCount" :min="4" :max="30" />
                  </n-form-item>
                  <n-form-item label="排序依据">
                    <n-input
                      v-model:value="config.typeListBy"
                      placeholder="time"
                      style="width: 120px"
                    />
                  </n-form-item>
                  <n-form-item label="年份筛选">
                    <n-input
                      v-model:value="config.typeListYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="排列顺序">
                    <n-radio-group v-model:value="config.typeListOrder">
                      <n-radio value="desc">倒序</n-radio>
                      <n-radio value="asc">正序</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="home-rank" tab="热榜">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">排行榜模块</n-divider>
                  <n-form-item label="启用排行榜">
                    <n-switch v-model:value="config.rankEnabled" />
                  </n-form-item>
                  <n-form-item label="指定分类">
                    <n-input
                      v-model:value="config.rankIds"
                      style="width: 200px"
                      placeholder="parent"
                    />
                  </n-form-item>
                  <n-form-item label="模块标题">
                    <n-input v-model:value="config.rankTitle" style="width: 200px" />
                  </n-form-item>
                  <n-form-item label="模块副标题">
                    <n-input v-model:value="config.rankSubtitle" style="width: 200px" />
                  </n-form-item>
                  <n-form-item label="数量">
                    <n-input-number v-model:value="config.rankCount" :min="5" :max="20" />
                  </n-form-item>
                  <n-form-item label="排序依据">
                    <n-input
                      v-model:value="config.rankBy"
                      placeholder="hits"
                      style="width: 120px"
                    />
                  </n-form-item>
                  <n-form-item label="年份筛选">
                    <n-input
                      v-model:value="config.rankYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="排列顺序">
                    <n-radio-group v-model:value="config.rankOrder">
                      <n-radio value="desc">倒序</n-radio>
                      <n-radio value="asc">正序</n-radio>
                    </n-radio-group>
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="home-links" tab="友情链接">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">友情链接</n-divider>
                  <n-form-item label="显示友情链接">
                    <n-switch v-model:value="config.showLinks" />
                  </n-form-item>
                  <n-form-item label="链接数量">
                    <n-input-number v-model:value="config.linksCount" :min="1" :max="99" />
                  </n-form-item>
                </n-form>
              </NTabPane>
            </NTabs>
          </NTabPane>

          <!-- 页面配置 -->
          <NTabPane name="page" tab="页面配置">
            <NTabs type="segment" animated>
              <NTabPane name="page-related" tab="相关推荐">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">相关推荐</n-divider>
                  <n-form-item label="模块标题">
                    <n-input v-model:value="config.relatedTitle" style="width: 200px" />
                  </n-form-item>
                  <n-form-item label="年份筛选">
                    <n-input
                      v-model:value="config.relatedYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="视频数量">
                    <n-input-number v-model:value="config.relatedCount" :min="4" :max="30" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="page-play" tab="播放页">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">播放页设置</n-divider>
                  <n-form-item label="显示排序">
                    <n-switch v-model:value="config.showSort" />
                  </n-form-item>
                  <n-form-item label="显示分享">
                    <n-switch v-model:value="config.showShare" />
                  </n-form-item>
                  <n-form-item label="显示报错">
                    <n-switch v-model:value="config.showReport" />
                  </n-form-item>
                  <n-form-item label="显示二维码">
                    <n-switch v-model:value="config.showQrcode" />
                  </n-form-item>
                  <n-form-item label="二维码提示">
                    <n-input v-model:value="config.qrcodeTips" style="width: 300px" />
                  </n-form-item>
                  <n-form-item label="版权处理">
                    <n-switch v-model:value="config.copyrightEnabled" />
                    <n-text depth="3" style="margin-left: 12px">开启后全站关闭播放器</n-text>
                  </n-form-item>
                  <n-form-item label="版权提示">
                    <n-input v-model:value="config.copyrightText" type="textarea" :rows="2" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="page-filter" tab="筛选页">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">筛选页设置</n-divider>
                  <n-form-item label="显示类型">
                    <n-switch v-model:value="config.filterShowClass" />
                  </n-form-item>
                  <n-form-item label="显示剧情">
                    <n-switch v-model:value="config.filterShowGenre" />
                  </n-form-item>
                  <n-form-item label="显示地区">
                    <n-switch v-model:value="config.filterShowArea" />
                  </n-form-item>
                  <n-form-item label="显示年份">
                    <n-switch v-model:value="config.filterShowYear" />
                  </n-form-item>
                  <n-form-item label="显示语言">
                    <n-switch v-model:value="config.filterShowLang" />
                  </n-form-item>
                  <n-form-item label="显示字母">
                    <n-switch v-model:value="config.filterShowLetter" />
                  </n-form-item>
                  <n-form-item label="显示排序">
                    <n-switch v-model:value="config.filterShowSort" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="page-type-home" tab="分类页">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">分类页（首页）</n-divider>
                  <n-form-item label="启用分类首页推荐">
                    <n-switch v-model:value="config.categoryEnabled" />
                  </n-form-item>
                  <n-form-item label="推荐数量">
                    <n-input-number v-model:value="config.categoryCount" :min="1" :max="30" />
                  </n-form-item>
                  <n-form-item label="推荐等级">
                    <n-input
                      v-model:value="config.categoryLevel"
                      placeholder="0 或 1,2,3"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="年份筛选">
                    <n-input
                      v-model:value="config.categoryYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="排序依据">
                    <n-input
                      v-model:value="config.categoryBy"
                      placeholder="time"
                      style="width: 120px"
                    />
                  </n-form-item>

                  <n-divider title-placement="left">分类页模块一</n-divider>
                  <n-form-item label="启用模块一">
                    <n-switch v-model:value="config.categoryMod1Enabled" />
                  </n-form-item>
                  <n-form-item label="标题/副标题">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.categoryMod1Title"
                        placeholder="标题"
                        style="width: 200px"
                      />
                      <n-input
                        v-model:value="config.categoryMod1Subtitle"
                        placeholder="副标题"
                        style="width: 240px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="排序/年份">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.categoryMod1By"
                        placeholder="time"
                        style="width: 120px"
                      />
                      <n-input
                        v-model:value="config.categoryMod1Year"
                        placeholder="留空不限制"
                        style="width: 200px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="数量/起始">
                    <n-space align="center">
                      <n-input-number v-model:value="config.categoryMod1Count" :min="1" :max="30" />
                      <n-input-number
                        v-model:value="config.categoryMod1Start"
                        :min="1"
                        :max="200"
                      />
                    </n-space>
                  </n-form-item>

                  <n-divider title-placement="left">分类页模块二（排行榜）</n-divider>
                  <n-form-item label="启用模块二">
                    <n-switch v-model:value="config.categoryMod2Enabled" />
                  </n-form-item>
                  <n-form-item label="标题/副标题">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.categoryMod2Title"
                        placeholder="标题"
                        style="width: 200px"
                      />
                      <n-input
                        v-model:value="config.categoryMod2Subtitle"
                        placeholder="副标题"
                        style="width: 240px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="数量/年份">
                    <n-space align="center">
                      <n-input-number v-model:value="config.categoryMod2Count" :min="1" :max="30" />
                      <n-input
                        v-model:value="config.categoryMod2Year"
                        placeholder="留空不限制"
                        style="width: 200px"
                      />
                    </n-space>
                  </n-form-item>

                  <n-divider title-placement="left">分类页模块三</n-divider>
                  <n-form-item label="启用模块三">
                    <n-switch v-model:value="config.categoryMod3Enabled" />
                  </n-form-item>
                  <n-form-item label="标题/副标题">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.categoryMod3Title"
                        placeholder="标题"
                        style="width: 200px"
                      />
                      <n-input
                        v-model:value="config.categoryMod3Subtitle"
                        placeholder="副标题"
                        style="width: 240px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="排序/年份">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.categoryMod3By"
                        placeholder="time"
                        style="width: 120px"
                      />
                      <n-input
                        v-model:value="config.categoryMod3Year"
                        placeholder="留空不限制"
                        style="width: 200px"
                      />
                    </n-space>
                  </n-form-item>
                  <n-form-item label="数量">
                    <n-input-number v-model:value="config.categoryMod3Count" :min="1" :max="30" />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="page-shortcuts" tab="快捷页">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">列表页快捷页</n-divider>
                  <n-form-item label="今日更新">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.todayTitle"
                        placeholder="今日更新"
                        style="width: 200px"
                      />
                      <n-input-number v-model:value="config.todayCount" :min="1" :max="200" />
                      <n-input
                        v-model:value="config.todayBy"
                        placeholder="time"
                        style="width: 120px"
                      />
                      <n-radio-group v-model:value="config.todayOrder">
                        <n-radio value="desc">倒序</n-radio>
                        <n-radio value="asc">正序</n-radio>
                      </n-radio-group>
                    </n-space>
                  </n-form-item>
                  <n-form-item label="今日更新年份">
                    <n-input
                      v-model:value="config.todayYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="新片上线">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.newTitle"
                        placeholder="新片上线"
                        style="width: 200px"
                      />
                      <n-input-number v-model:value="config.newCount" :min="1" :max="200" />
                      <n-input
                        v-model:value="config.newBy"
                        placeholder="time"
                        style="width: 120px"
                      />
                      <n-radio-group v-model:value="config.newOrder">
                        <n-radio value="desc">倒序</n-radio>
                        <n-radio value="asc">正序</n-radio>
                      </n-radio-group>
                    </n-space>
                  </n-form-item>
                  <n-form-item label="新片上线年份">
                    <n-input
                      v-model:value="config.newYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>

                  <n-divider title-placement="left">热榜页面</n-divider>
                  <n-form-item label="最近热门">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.hotPageTitle"
                        placeholder="最近热门"
                        style="width: 200px"
                      />
                      <n-input-number v-model:value="config.hotPageCount" :min="1" :max="200" />
                      <n-input
                        v-model:value="config.hotPageBy"
                        placeholder="hits"
                        style="width: 120px"
                      />
                      <n-radio-group v-model:value="config.hotPageOrder">
                        <n-radio value="desc">倒序</n-radio>
                        <n-radio value="asc">正序</n-radio>
                      </n-radio-group>
                    </n-space>
                  </n-form-item>
                  <n-form-item label="最近热门年份">
                    <n-input
                      v-model:value="config.hotPageYear"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                  <n-form-item label="近期热门">
                    <n-space align="center">
                      <n-input
                        v-model:value="config.hotPage2Title"
                        placeholder="近期热门"
                        style="width: 200px"
                      />
                      <n-input-number v-model:value="config.hotPage2Count" :min="1" :max="200" />
                      <n-input
                        v-model:value="config.hotPage2By"
                        placeholder="hits"
                        style="width: 120px"
                      />
                      <n-radio-group v-model:value="config.hotPage2Order">
                        <n-radio value="desc">倒序</n-radio>
                        <n-radio value="asc">正序</n-radio>
                      </n-radio-group>
                    </n-space>
                  </n-form-item>
                  <n-form-item label="近期热门年份">
                    <n-input
                      v-model:value="config.hotPage2Year"
                      placeholder="留空不限制"
                      style="width: 200px"
                    />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="page-list" tab="列表/详情">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">列表页配置</n-divider>
                  <n-form-item label="每页显示数量">
                    <n-input-number v-model:value="config.listPageSize" :min="10" :max="50" />
                  </n-form-item>
                  <n-form-item label="最新更新数量">
                    <n-input-number v-model:value="config.latestCount" :min="4" :max="30" />
                  </n-form-item>

                  <n-divider title-placement="left">详情页配置</n-divider>
                  <n-form-item label="显示评论">
                    <n-switch v-model:value="config.showComments" />
                  </n-form-item>
                  <n-form-item label="显示相关推荐">
                    <n-switch v-model:value="config.showRelated" />
                  </n-form-item>
                  <n-form-item label="显示评分">
                    <n-switch v-model:value="config.showScore" />
                  </n-form-item>
                </n-form>
              </NTabPane>
            </NTabs>
          </NTabPane>

          <!-- 其他配置 -->
          <NTabPane name="other" tab="其他配置">
            <NTabs type="segment" animated>
              <NTabPane name="other-notice" tab="公告">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">弹窗公告</n-divider>
                  <n-form-item label="启用公告">
                    <n-switch v-model:value="config.noticeEnabled" />
                  </n-form-item>
                  <n-form-item label="公告标题">
                    <n-input
                      v-model:value="config.noticeTitle"
                      placeholder="网站公告"
                      style="width: 300px"
                    />
                  </n-form-item>
                  <n-form-item label="公告内容">
                    <n-input
                      v-model:value="config.noticeContent"
                      type="textarea"
                      :rows="3"
                      placeholder="支持HTML，留空则不显示公告"
                    />
                  </n-form-item>

                  <n-divider title-placement="left">滚动公告</n-divider>
                  <n-form-item label="启用滚动公告">
                    <n-switch v-model:value="config.scrollNoticeEnabled" />
                  </n-form-item>
                  <n-form-item label="滚动文字">
                    <n-input
                      v-model:value="config.scrollNoticeText"
                      placeholder="滚动显示的公告文字"
                      style="width: 400px"
                    />
                  </n-form-item>
                  <n-form-item label="点击链接">
                    <n-input
                      v-model:value="config.scrollNoticeUrl"
                      placeholder="点击公告跳转的URL（可选）"
                      style="width: 400px"
                    />
                  </n-form-item>

                  <n-divider title-placement="left">页脚自定义提示</n-divider>
                  <n-form-item label="启用自定义提示">
                    <n-switch v-model:value="config.footerCustomEnabled" />
                  </n-form-item>
                  <n-form-item label="提示内容">
                    <n-input
                      v-model:value="config.footerCustomText"
                      type="textarea"
                      :rows="2"
                      placeholder="支持HTML，显示在页脚版权上方"
                    />
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="other-sec" tab="防调试">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">防调试（可选）</n-divider>
                  <n-form-item label="禁用 F12">
                    <n-switch v-model:value="config.blockF12" />
                  </n-form-item>
                  <n-form-item label="禁用 Ctrl 组合键">
                    <n-switch v-model:value="config.blockCtrl" />
                  </n-form-item>
                  <n-form-item label="禁用右键">
                    <n-switch v-model:value="config.blockRightClick" />
                  </n-form-item>
                  <n-form-item label="Debugger 断点">
                    <n-switch v-model:value="config.blockDebugger" />
                    <n-text depth="3" style="margin-left: 12px">检测到开发者工具时触发断点</n-text>
                  </n-form-item>
                  <n-form-item label="提示文案">
                    <n-input
                      v-model:value="config.blockTips"
                      placeholder="你知道的太多了"
                      style="width: 320px"
                    />
                  </n-form-item>
                  <n-form-item label="跳转地址">
                    <n-input
                      v-model:value="config.blockRedirectUrl"
                      placeholder="检测到调试时跳转的URL（可选）"
                      style="width: 320px"
                    />
                    <n-text depth="3" style="margin-left: 12px">填写后将跳转而非触发断点</n-text>
                  </n-form-item>
                </n-form>
              </NTabPane>

              <NTabPane name="other-custom" tab="样式/统计">
                <n-form label-placement="left" label-width="140">
                  <n-divider title-placement="left">自定义样式/统计</n-divider>
                  <n-form-item label="自定义 CSS">
                    <n-input
                      v-model:value="config.customCss"
                      type="textarea"
                      :rows="3"
                      placeholder="全站自定义 CSS（可选）"
                    />
                  </n-form-item>
                  <n-form-item label="统计代码">
                    <n-input
                      v-model:value="config.statsCode"
                      type="textarea"
                      :rows="2"
                      placeholder="统计/站点代码（可选）"
                    />
                  </n-form-item>
                </n-form>
              </NTabPane>
            </NTabs>
          </NTabPane>

          <NTabPane name="ads" tab="广告配置">
            <n-form label-placement="left" label-width="140">
              <n-divider title-placement="left">广告代码（HTML）</n-divider>
              <n-form-item label="首页顶部广告">
                <n-input
                  v-model:value="config.adHomeTop"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
              <n-form-item label="首页底部广告">
                <n-input
                  v-model:value="config.adHomeBottom"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
              <n-form-item label="详情页广告">
                <n-input
                  v-model:value="config.adDetail"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
              <n-form-item label="播放页广告">
                <n-input
                  v-model:value="config.adPlayer"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
              <n-form-item label="搜索页广告">
                <n-input
                  v-model:value="config.adSearch"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
              <n-form-item label="筛选页广告">
                <n-input
                  v-model:value="config.adScreen"
                  type="textarea"
                  :rows="2"
                  placeholder="HTML广告代码"
                />
              </n-form-item>
            </n-form>
          </NTabPane>
        </NTabs>

        <n-space justify="center" style="margin-top: 24px">
          <n-button type="primary" :loading="saving" @click="save">保存配置</n-button>
        </n-space>
      </NSpin>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NSpin, NTabPane, NTabs, useMessage } from 'naive-ui';
import { http } from '../../../lib/http';
import UploadInput from '../../components/UploadInput.vue';

const THEME_NAME = 'mxpro';

const msg = useMessage();
const loading = ref(false);
const saving = ref(false);

const config = reactive({
  // 基础配置
  logoLight: '',
  logoDark: '',
  favicon: '',
  searchPlaceholder: '',
  footerSuffix: '',
  loadingPic: '/mxpro/images/load.gif',

  // 导航配置（mxprost s2）
  navTargetBlank: false,
  navThemeOpen: false,
  navDefaultTheme: 'white',
  navTypeIds: 'parent',
  navIconDefault: 'icon-jl-o',
  navNum1: 1,
  navNum2: 2,
  navNum3: 3,
  navNum4: 4,
  navNum5: 0,
  navNum6: 0,
  navNum7: 0,
  navIcon1: 'icon-dy-o',
  navIcon2: 'icon-tv-o',
  navIcon3: 'icon-zy-o',
  navIcon4: 'icon-dm-o',
  navIcon5: '',
  navIcon6: '',
  navIcon7: '',
  navDiy1: false,
  navDiy1Name: '',
  navDiy1Url: '',
  navDiy1Icon: 'icon-diy',
  navDiy2: false,
  navDiy2Name: '',
  navDiy2Url: '',
  navDiy2Icon: 'icon-diy',
  navApp: true,
  navAppName: 'APP',
  navAppUrl: '/app',
  navAppIcon: 'icon-phone-o',
  navTodayNew: true,
  navHot: true,
  fixedGroupEnabled: true,
  fixedGroupThemeToggle: true,
  fixedGroupRetop: true,
  fixedGroupGbook: true,
  searchTips: true,

  // 幻灯片
  slideEnabled: true,
  slideBill: true,
  slideLevel: '5',
  slideCount: 10,
  slideBy: 'time',
  slideOrder: 'desc',
  slideSub: true,
  // 周表
  weekEnabled: false,
  weekTitle: '新番时刻表',
  weekCount: 8,
  // 推荐
  hotEnabled: true,
  hotHorizontal: true,
  hotTitle: '热门推荐',
  hotLevel: '1',
  hotCount: 16,
  // 分类模块
  typeListEnabled: true,
  typeListIds: 'parent',
  typeListCount: 16,
  typeListBy: 'time',
  typeListYear: '',
  typeListOrder: 'desc',
  // 排行榜
  rankEnabled: true,
  rankIds: 'parent',
  rankTitle: '排行榜',
  rankSubtitle: 'TOP10',
  rankCount: 10,
  rankBy: 'hits',
  rankYear: '',
  rankOrder: 'desc',
  // 友情链接
  showLinks: true,
  linksCount: 99,
  // 相关推荐
  relatedTitle: '猜你喜欢',
  relatedYear: '',
  relatedCount: 16,
  // 播放页
  showSort: true,
  showShare: true,
  showReport: true,
  showQrcode: true,
  qrcodeTips: '扫码观看',
  copyrightEnabled: false,
  copyrightText: '该视频暂无法播放',

  // 分类页（首页）(mxprost s4.type*)
  categoryEnabled: true,
  categoryCount: 10,
  categoryLevel: '0',
  categoryYear: '2022',
  categoryBy: 'time',
  categoryMod1Enabled: true,
  categoryMod1Title: '新片上线',
  categoryMod1Subtitle: 'NEW FILM ONLINE',
  categoryMod1By: 'time',
  categoryMod1Year: '2022',
  categoryMod1Count: 16,
  categoryMod1Start: 9,
  categoryMod2Enabled: true,
  categoryMod2Title: '排行榜',
  categoryMod2Subtitle: 'RANKING',
  categoryMod2Year: '',
  categoryMod2Count: 16,
  categoryMod3Enabled: true,
  categoryMod3Title: '最近更新',
  categoryMod3Subtitle: 'LATEST UPDATE',
  categoryMod3By: 'time',
  categoryMod3Year: '',
  categoryMod3Count: 16,

  // 今日更新/新片上线/热榜页面（mxprost s4.new/hot）
  todayTitle: '今日更新',
  todayBy: 'time',
  todayOrder: 'asc',
  todayYear: '',
  todayCount: 48,
  newTitle: '新片上线',
  newBy: 'time',
  newOrder: 'asc',
  newYear: '2022',
  newCount: 48,
  hotPageTitle: '最近热门',
  hotPageBy: 'hits',
  hotPageOrder: 'asc',
  hotPageYear: '',
  hotPageCount: 48,
  hotPage2Title: '近期热门',
  hotPage2By: 'hits',
  hotPage2Order: 'asc',
  hotPage2Year: '2022',
  hotPage2Count: 48,

  // 防调试/自定义（mxprost s5）
  blockF12: false,
  blockCtrl: false,
  blockRightClick: false,
  blockDebugger: false,
  blockTips: '你知道的太多了',
  blockRedirectUrl: '',
  customCss: '',
  statsCode: '',

  // 筛选页
  filterShowClass: true,
  filterShowGenre: true,
  filterShowArea: true,
  filterShowYear: true,
  filterShowLang: true,
  filterShowLetter: true,
  filterShowSort: true,
  // 列表页
  latestCount: 14,
  listPageSize: 28,
  // 详情页
  showComments: true,
  showRelated: true,
  showScore: true,
  // 公告
  noticeEnabled: false,
  noticeTitle: '网站公告',
  noticeContent: '',
  // 滚动公告
  scrollNoticeEnabled: false,
  scrollNoticeText: '',
  scrollNoticeUrl: '',
  // 页脚自定义提示
  footerCustomEnabled: false,
  footerCustomText: '',
  // 广告
  adHomeTop: '',
  adHomeBottom: '',
  adDetail: '',
  adPlayer: '',
  adSearch: '',
  adScreen: '',
});

async function loadConfig() {
  loading.value = true;
  try {
    const res = await http.get('/admin/theme/config', { params: { name: THEME_NAME } });
    Object.assign(config, res.data || {});
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await http.post('/admin/theme/config', config, { params: { name: THEME_NAME } });
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(e?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => loadConfig());
</script>
