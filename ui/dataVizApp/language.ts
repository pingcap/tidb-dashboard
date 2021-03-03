// Modified from github.com/microsoft/SandDance under the MIT license.
import { DataSource } from './types'

const i18nStrings = {
  zh: {
    buttonLoadData: '导入数据',
    buttonThemeDark: '暗色',
    buttonThemeLight: '亮色',
    buttonExport: '导出数据',
    menuUserData: '其他来源',
    menuLocal: '本地文件',
    menuUrl: '在线 URL',
    menuSnapshotsExportAsJSON: '导出为 JSON 快照',
    menuSnapshotsExportAs: '导出为 ...',
    menuSnapshotsImport: '导入 JSON 快照',
    dialogTitleLocal: '从本地导入数据',
    dialogSubtextLocal:
      '文件不会被上传，目前只支持以下数据格式 json (默认), csv, tsv, 以及 topojson',
    dialogTitleUrl: '从在线 URL 中导入数据',
    dialogTitleSnapshotsExport: '导出为',
    dialogTitleSnapshotsLocal: '从本地 JSON 快照导入数据',
    dialogSubtextSnapshotsLocal: '文件不会被上传',
    dialogTitleSnapshotsUrl: '从在线 URL 中导入快照数据',
    dialogLoadButton: '导入',
    labelLocal: '[本地]',
    labelColorFilter: '注意：查看已保存的图表时，颜色将重新映射',
    labelPreferences: '偏好',
    labelCompactUI: '紧凑界面',
    labelCompactUIDescription: '紧凑界面下，可折叠内容将被折叠，元素间距将缩小',
    labelSnapshotsExportHTMLTitle: 'HTML',
    labelSnapshotsExportHTMLDescription:
      'A self contained HTML page with current data and snapshots pre-loaded.',
    labelSnapshotsExportMarkdownTitle: 'Markdown',
    labelSnapshotsExportMarkdownDescription:
      'Markdown is a language used by many blogging platforms. Exports a Markdown file with thumbnails of these snapshots which link back to the SandDance website.',
    labelSnapshotsShortcut: '提示：您的 .snapshots JSON 文件也可以被预加载',
    labelGetLink: '获取 URL',
    labelLink: 'link',
    labelLinkDescription: '复制快照 URL 到剪贴板',
    msgCopyLinkSuccess: '复制成功',
    msgCopyLinkFail: '请手动复制以下 URL',
    labelUrl: 'Url',
    labelDataFormat: '数据格式',
    labelDataUrlShortcut: '提示：您的数据文件也可以被预加载',
    urlInputPlaceholder: '粘贴 URL',
    dashboardDataPrefix: 'TiDB Dashboard',
    localFilePrefix: '本地文件',
    urlPrefix: 'Url',
    errorInvalidFileFormat: '文件格式不正确',
    errorNoUrl: '请输入 URL',
    errorUrlHttp: 'URL 必须以 http 开头',
    errorDownloadFailure: '数据无法被导出',
    errorDataSourceFromLocal: (ds: DataSource, e: Error) => [
      `无法从本地文件导入 ${ds.type} 数据`,
      `原因: ${e.message}`,
    ],
    errorDataSourceFromDashboard: (ds: DataSource, e: Error) => [
      `无法从 TiDB-Dashboard 中导入 ${ds.id} 数据`,
      `原因: ${
        e.message.includes('401') ? '请先登录 TiDB-Dashboard !' : e.message
      }`,
    ],
    errorDataSourceFromUrl: (ds: DataSource, e: Error) => [
      `无法从 ${ds.dataUrl} 导入 ${ds.type} 数据`,
      `原因: ${e.message}`,
    ],
  },
  en: {
    buttonLoadData: 'Load data',
    buttonThemeDark: 'Dark',
    buttonThemeLight: 'Light',
    buttonExport: 'Export',
    menuUserData: 'Other Source',
    menuLocal: 'From local file',
    menuUrl: 'From URL',
    menuSnapshotsExportAsJSON: 'Export as .snapshots JSON file',
    menuSnapshotsExportAs: 'Export as ...',
    menuSnapshotsImport: 'Import a .snapshots JSON file',
    dialogTitleLocal: 'Use a file from your computer',
    dialogSubtextLocal:
      'Your file will not be uploaded, it is only used by the browser on this computer.  The currently supported data formats are json (the default), csv (comma-separated values), tsv (tab-separated values), and topojson.',
    dialogTitleUrl: 'Use a data file via URL',
    dialogTitleSnapshotsExport: 'Export as',
    dialogTitleSnapshotsLocal: 'Use a snapshots file from your computer',
    dialogSubtextSnapshotsLocal:
      'Use a file that was previously exported snapshots file. Your file will not be uploaded, it is only used by the browser on this computer.',
    dialogTitleSnapshotsUrl: 'Use a snapshots file via URL',
    dialogLoadButton: 'Load',
    labelLocal: '[local]',
    labelColorFilter:
      'Note: Colors will be re-mapped to the filter when viewing this saved chart.',
    labelPreferences: 'Preferences',
    labelCompactUI: 'Compact UI',
    labelCompactUIDescription:
      'Compact UI hides collapses labels on dropdown menus.',
    labelSnapshotsExportHTMLTitle: 'HTML',
    labelSnapshotsExportHTMLDescription:
      'A self contained HTML page with current data and snapshots pre-loaded.',
    labelSnapshotsExportMarkdownTitle: 'Markdown',
    labelSnapshotsExportMarkdownDescription:
      'Markdown is a language used by many blogging platforms. Exports a Markdown file with thumbnails of these snapshots which link back to the SandDance website.',
    labelSnapshotsShortcut:
      'Tip: Your .snapshots JSON file can also be pre-loaded with this',
    labelGetLink: 'Get link',
    labelLink: 'link',
    labelLinkDescription: 'Copy snapshot link to clipboard',
    msgCopyLinkSuccess: 'Successfully copied!',
    msgCopyLinkFail: 'Please copy link manually',
    labelUrl: 'Url',
    labelDataFormat: 'Data format',
    labelDataUrlShortcut:
      'Tip: Your data file can also be pre-loaded with this',
    urlInputPlaceholder: 'paste URL',
    dashboardDataPrefix: 'TiDB Dashboard',
    localFilePrefix: 'Local file',
    urlPrefix: 'Url',
    errorInvalidFileFormat: 'Invalid file format',
    errorNoUrl: 'Please enter a url',
    errorUrlHttp: 'Url must begin with "http"',
    errorDownloadFailure: 'Data could not be prepared for download.',
    errorDataSourceFromLocal: (ds: DataSource, e: Error) => [
      `Could not load ${ds.type} data from local file.`,
      `Error: ${e.message}`,
    ],
    errorDataSourceFromDashboard: (ds: DataSource, e: Error) => [
      `Could not load ${ds.id} data from TiDB-Dashboard.`,
      `Error: ${
        e.message.includes('401')
          ? 'Please login TiDB-Dashboard first!'
          : e.message
      }`,
    ],
    errorDataSourceFromUrl: (ds: DataSource, e: Error) => [
      `Could not load ${ds.type} data from ${ds.dataUrl}`,
      `Error: ${e.message}`,
    ],
  },
}

// To avoid bundling unnecessary packages, hard code the field name in localstorage of language instead of importing i18n
const LANGUAGE_KEY = 'i18nextLng'

export const strings: typeof i18nStrings['en'] =
  i18nStrings[localStorage.getItem(LANGUAGE_KEY) || 'en'] || i18nStrings.en
