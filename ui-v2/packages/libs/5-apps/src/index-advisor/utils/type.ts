import { capitalize } from "lodash-es"

import {
  ServerlessClusterAdviseIndexesResp,
  ServerlessGetIndexAdviceSummaryResp,
  ServerlessIndexAdvice,
  ServerlessIndexAdviceImpact,
  ServerlessListIndexAdvicesResp,
} from "../models"

export type IndexAdvisorsSummary = ServerlessGetIndexAdviceSummaryResp
export type ImpactedQueryItem = ServerlessIndexAdviceImpact
export type IndexAdvisorItem = ServerlessIndexAdvice
export type IndexAdvisorsListRes = ServerlessListIndexAdvicesResp
export type GenAdvisorRes = ServerlessClusterAdviseIndexesResp

export type IndexAdvisorsListReq = {
  status: string
  search: string
  orderBy: string
  desc: boolean
  curPage: number
  pageSize: number
}

export type Pagination = {
  curPage: number
  pageSize: number
}

export type SortRule = {
  orderBy: string
  desc: boolean
}

export const FEATURE_NAME = "Index Advisor"
export const STATUS_OPTIONS = ["OPEN", "CLOSED", "APPLYING", "APPLIED"].map(
  (s) => ({ label: capitalize(s), value: s }),
)
