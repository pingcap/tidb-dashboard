import { createContext, useContext } from "react"

import {
  GenAdvisorRes,
  IndexAdvisorItem,
  IndexAdvisorsListReq,
  IndexAdvisorsListRes,
  IndexAdvisorsSummary,
} from "../utils/type"

type IndexAdvisorApi = {
  getAdvisorsSummary(): Promise<IndexAdvisorsSummary>
  getAdvisors(params: IndexAdvisorsListReq): Promise<IndexAdvisorsListRes>
  getAdvisor(params: { advisorId: string }): Promise<IndexAdvisorItem>
  applyAdvisor(params: { advisorId: string }): Promise<void>
  closeAdvisor(params: { advisorId: string }): Promise<void>
  deleteAdvisor(params: { advisorId: string }): Promise<void>
  genAdvisor(params: { sql: string }): Promise<GenAdvisorRes>
}

export type IndexAdvisorCtxValue = {
  ctxId: string
  api: IndexAdvisorApi
}

export const IndexAdvisorContext = createContext<IndexAdvisorCtxValue | null>(
  null,
)

export const useIndexAdvisorContext = () => {
  const indexAdvisorCtx = useContext(IndexAdvisorContext)
  if (indexAdvisorCtx === null) {
    throw new Error("IndexAdvisorContext must be used within a provider")
  }
  return indexAdvisorCtx
}
