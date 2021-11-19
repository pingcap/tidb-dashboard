import { AimOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'instance_profiling',
  routerPrefix: '/instance_profiling',
  icon: AimOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_instance_profiling" */ '.'),
}
