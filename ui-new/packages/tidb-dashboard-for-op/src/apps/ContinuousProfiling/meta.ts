import { AimOutlined } from '@ant-design/icons'

export default {
  id: 'conprof',
  routerPrefix: '/continuous_profiling',
  icon: AimOutlined,
  reactRoot: () => import('.')
}
