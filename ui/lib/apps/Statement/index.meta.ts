import { ThunderboltOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'statement',
  routerPrefix: '/statement',
  icon: ThunderboltOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_statement" */ '.'),
}
