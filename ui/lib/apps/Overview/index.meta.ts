import { AppstoreOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'overview',
  routerPrefix: '/overview',
  icon: AppstoreOutlined,
  isDefaultRouter: true,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_overview" */ '.'),
}
