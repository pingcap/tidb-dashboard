import { BugOutlined } from '@ant-design/icons'

export default {
  id: 'debug_playground',
  routerPrefix: '/debug_playground',
  icon: BugOutlined,
  reactRoot: () => import(/* webpackChunkName: "debug_playground" */ '.'),
}
