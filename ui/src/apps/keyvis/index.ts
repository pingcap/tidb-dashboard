import { AppConfig } from '@pingcap-incubator/keyvis'

export default {
  ...AppConfig,
  loader: () => import('./app'),
}
