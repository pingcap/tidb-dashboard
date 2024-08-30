import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  UserSignOutInfo,
  SsoCreateImpersonationRequest,
  SsoSSOImpersonationModel,
  ConfigSSOCoreConfig,
  SsoSetConfigRequest,
  CodeShareRequest,
  CodeShareResponse,
  MetricsGetPromAddressConfigResponse,
  MetricsPutCustomPromAddressRequest,
  MetricsPutCustomPromAddressResponse
} from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IUserProfileDataSource {
  userGetSignOutInfo(
    redirectUrl?: string,
    options?: ReqConfig
  ): AxiosPromise<UserSignOutInfo>

  userSSOCreateImpersonation(
    request: SsoCreateImpersonationRequest,
    options?: ReqConfig
  ): AxiosPromise<SsoSSOImpersonationModel>

  userSSOGetConfig(options?: ReqConfig): AxiosPromise<ConfigSSOCoreConfig>

  userSSOListImpersonations(
    options?: ReqConfig
  ): AxiosPromise<Array<SsoSSOImpersonationModel>>

  userSSOSetConfig(
    request: SsoSetConfigRequest,
    options?: ReqConfig
  ): AxiosPromise<ConfigSSOCoreConfig>

  userShareSession(
    request: CodeShareRequest,
    options?: ReqConfig
  ): AxiosPromise<CodeShareResponse>

  userRevokeSession(options?: ReqConfig): AxiosPromise<void>

  metricsGetPromAddress(
    options?: ReqConfig
  ): AxiosPromise<MetricsGetPromAddressConfigResponse>

  metricsSetCustomPromAddress(
    request: MetricsPutCustomPromAddressRequest,
    options?: ReqConfig
  ): AxiosPromise<MetricsPutCustomPromAddressResponse>
}

export interface IUserProfileEvent {
  logOut(): void
}

export interface IUserProfileContext {
  ds: IUserProfileDataSource
  event: IUserProfileEvent
}

export const UserProfileContext = createContext<IUserProfileContext | null>(
  null
)

export const UserProfileProvider = UserProfileContext.Provider
