import { AppConfig } from '@pingcap-incubator/statement'

export default {
  ...AppConfig,
  loader: () => import('./app'),
}
