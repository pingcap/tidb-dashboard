import { FileSearchOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'search_logs',
  routerPrefix: '/search_logs',
  icon: FileSearchOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_search_logs" */ '.'),
}
