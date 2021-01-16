import { FireOutlined } from '@ant-design/icons'

export default {
  id: '__APP_NAME__',
  routerPrefix: '/__APP_NAME__',
  icon: FireOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app___APP_NAME__'," */ '.'),
}
