/**
 * 主题配置类型定义
 * 包含所有160个配置字段
 */
export interface ThemeConfig {
  // 基本设置
  logoLight?: string
  logoDark?: string
  favicon?: string
  loadingPic?: string
  searchPlaceholder?: string
  searchTips?: string

  // 页脚设置
  footerSuffix?: string
  footerFeedbackText?: string
  footerFeedbackUrl?: string
  footerQQText?: string
  footerQQUrl?: string
  footerTelegramText?: string
  footerTelegramUrl?: string
  footerCustomText?: string
  footerSitemapEnabled?: boolean
  footerFeedbackEnabled?: boolean
  footerQQEnabled?: boolean
  footerTelegramEnabled?: boolean
  footerCustomEnabled?: boolean

  // 导航设置
  navDefaultTheme?: 'light' | 'dark'
  navTypeIds?: string
  navIconDefault?: string
  navNum1?: string
  navIcon1?: string
  navNum2?: string
  navIcon2?: string
  navNum3?: string
  navIcon3?: string
  navNum4?: string
  navIcon4?: string
  navNum5?: string
  navIcon5?: string
  navNum6?: string
  navIcon6?: string
  navNum7?: string
  navIcon7?: string
  navDiy1Name?: string
  navDiy1Url?: string
  navDiy1Icon?: string
  navDiy2Name?: string
  navDiy2Url?: string
  navDiy2Icon?: string
  navAppName?: string
  navAppUrl?: string
  navAppIcon?: string
  navTargetBlank?: boolean
  navThemeOpen?: boolean
  navTodayNew?: boolean
  navHot?: boolean
  navApp?: boolean

  // APP下载设置
  appTitle?: string
  appSubtitle?: string
  appQrcode?: string
  appAndroidUrl?: string
  appAndroidText?: string
  appAndroidIcon?: string
  appAndroidEnabled?: boolean
  appIosUrl?: string
  appIosText?: string
  appIosIcon?: string
  appIosEnabled?: boolean
  appWinUrl?: string
  appWinText?: string
  appWinIcon?: string
  appWinEnabled?: boolean

  // 幻灯片设置
  slideEnabled?: boolean
  slideBill?: string
  slideLevel?: string
  slideCount?: string
  slideBy?: 'time' | 'hits'
  slideOrder?: 'asc' | 'desc'
  slideSub?: string

  // 周推荐设置
  weekEnabled?: boolean
  weekTitle?: string
  weekCount?: string

  // 热门推荐设置
  hotEnabled?: boolean
  hotTitle?: string
  hotLevel?: string
  hotCount?: string
  hotHorizontal?: boolean

  // 分类列表设置
  typeListEnabled?: boolean
  typeListIds?: string
  typeListCount?: string
  typeListBy?: 'time' | 'hits'
  typeListYear?: string
  typeListOrder?: 'asc' | 'desc'

  // 排行榜设置
  rankEnabled?: boolean
  rankIds?: string
  rankTitle?: string
  rankSubtitle?: string
  rankCount?: string
  rankBy?: 'time' | 'hits'
  rankYear?: string
  rankOrder?: 'asc' | 'desc'

  // 友情链接设置
  showLinks?: boolean
  linksCount?: string

  // 分类页设置
  categoryLevel?: string
  categoryBy?: 'time' | 'hits'
  categoryYear?: string
  categoryCount?: string
  categoryMod1Title?: string
  categoryMod1Subtitle?: string
  categoryMod1By?: 'time' | 'hits'
  categoryMod1Year?: string
  categoryMod1Count?: string
  categoryMod1Start?: string
  categoryMod2Title?: string
  categoryMod2Subtitle?: string
  categoryMod2By?: 'time' | 'hits'
  categoryMod2Year?: string
  categoryMod2Count?: string
  categoryMod2Start?: string
  categoryMod3Title?: string
  categoryMod3Subtitle?: string
  categoryMod3By?: 'time' | 'hits'
  categoryMod3Year?: string
  categoryMod3Count?: string
  categoryMod3Start?: string

  // 今日更新页设置
  todayTitle?: string
  todayBy?: 'time' | 'hits'
  todayOrder?: 'asc' | 'desc'
  todayYear?: string
  todayCount?: string

  // 最新上映页设置
  newTitle?: string
  newBy?: 'time' | 'hits'
  newOrder?: 'asc' | 'desc'
  newYear?: string
  newCount?: string

  // 热门影片页设置
  hotPageTitle?: string
  hotPageBy?: 'time' | 'hits'
  hotPageOrder?: 'asc' | 'desc'
  hotPageYear?: string
  hotPageCount?: string
  hotPage2Title?: string
  hotPage2By?: 'time' | 'hits'
  hotPage2Order?: 'asc' | 'desc'
  hotPage2Year?: string
  hotPage2Count?: string

  // 详情页设置
  latestCount?: string
  qrcodeTips?: string
  relatedTitle?: string
  relatedYear?: string
  relatedCount?: string

  // 列表页设置
  listPageSize?: string

  // 公告设置
  noticeTitle?: string
  noticeContent?: string
  scrollNoticeText?: string
  scrollNoticeUrl?: string

  // 广告位设置
  adHomeTop?: string
  adHomeBottom?: string
  adDetail?: string
  adPlayer?: string
  adSearch?: string
  adScreen?: string

  // 自定义代码
  customCss?: string
  statsCode?: string

  // 其他设置
  copyrightText?: string
  blockTips?: string
  blockRedirectUrl?: string
}

/**
 * 配置字段键类型
 */
export type ThemeConfigKey = keyof ThemeConfig

/**
 * 配置值类型映射
 */
export type ThemeConfigValue<K extends ThemeConfigKey> = ThemeConfig[K]
