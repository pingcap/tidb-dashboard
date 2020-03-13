import { translations } from '@pingcap-incubator/statement'

export default {
  id: 'statement',
  loader: () => import('./app.js'),
  routerPrefix: '/statement',
  icon: 'thunderbolt',
  translations,
}
