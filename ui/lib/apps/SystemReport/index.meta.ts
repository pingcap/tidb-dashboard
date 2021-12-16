import { SnippetsOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'system_report',
  routerPrefix: '/system_report',
  icon: SnippetsOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_system_report" */ '.'),
}
