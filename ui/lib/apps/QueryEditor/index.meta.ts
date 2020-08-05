import { ConsoleSqlOutlined } from '@ant-design/icons'

export default {
  id: 'query_editor',
  routerPrefix: '/query_editor',
  icon: ConsoleSqlOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "query_editor" */ '.'),
}
