import {
  IUserProfileDataSource,
  IUserProfileContext,
  ReqConfig,
  IUserProfileEvent
} from '@pingcap/tidb-dashboard-lib'

import client, {
  SsoCreateImpersonationRequest,
  SsoSetConfigRequest,
  CodeShareRequest,
  MetricsPutCustomPromAddressRequest
} from '~/client'

class DataSource implements IUserProfileDataSource {
  userGetSignOutInfo(redirectUrl?: string, options?: ReqConfig) {
    return client.getInstance().userGetSignOutInfo({ redirectUrl }, options)
  }

  userSSOCreateImpersonation(
    request: SsoCreateImpersonationRequest,
    options?: ReqConfig
  ) {
    return client.getInstance().userSSOCreateImpersonation({ request }, options)
  }

  userSSOGetConfig(options?: ReqConfig) {
    return client.getInstance().userSSOGetConfig(options)
  }

  userSSOListImpersonations(options?: ReqConfig) {
    return client.getInstance().userSSOListImpersonations(options)
  }

  userSSOSetConfig(request: SsoSetConfigRequest, options?: ReqConfig) {
    return client.getInstance().userSSOSetConfig({ request }, options)
  }

  userShareSession(request: CodeShareRequest, options?: ReqConfig) {
    return client.getInstance().userShareSession({ request }, options)
  }

  userRevokeSession(options?: ReqConfig) {
    return client.getInstance().userRevokeSession(options)
  }

  metricsGetPromAddress(options?: ReqConfig) {
    return client.getInstance().metricsGetPromAddress(options)
  }

  metricsSetCustomPromAddress(
    request: MetricsPutCustomPromAddressRequest,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .metricsSetCustomPromAddress({ request }, options)
  }
}

class EventHandler implements IUserProfileEvent {
  logOut(): void {}
}

export const ctx: IUserProfileContext = {
  ds: new DataSource(),
  event: new EventHandler()
}
