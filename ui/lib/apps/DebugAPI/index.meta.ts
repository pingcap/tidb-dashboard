import { ApiOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'debug_api',
  routerPrefix: '/debug_api',
  icon: ApiOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_debug_api" */ '.'),
}
