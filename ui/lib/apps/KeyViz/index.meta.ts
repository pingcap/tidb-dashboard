import { EyeOutlined } from '@ant-design/icons'

export default {
  id: 'keyviz',
  routerPrefix: '/keyviz',
  icon: EyeOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_keyviz" */ '.'),
}
