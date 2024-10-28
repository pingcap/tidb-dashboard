import {
  GenAdvisorRes,
  IndexAdvisorCtxValue,
  IndexAdvisorItem,
  IndexAdvisorsListRes,
  IndexAdvisorsSummary,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/index-advisor"

import advisorsItems from "./sample-data/list.json"
import advisorsSummary from "./sample-data/summary.json"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let advicesCache: IndexAdvisorItem[] = []

export function getIndexAdvisorContext(): IndexAdvisorCtxValue {
  return {
    ctxId: "unique-id",
    api: {
      getAdvisorsSummary(): Promise<IndexAdvisorsSummary> {
        return delay(1000).then(() => advisorsSummary)
      },
      getAdvisors(): Promise<IndexAdvisorsListRes> {
        return delay(1000).then(() => {
          advicesCache = advisorsItems.advices.slice()
          return advisorsItems
        })
      },
      getAdvisor({ advisorId }): Promise<IndexAdvisorItem> {
        return delay(1000).then(() => {
          const ret = advicesCache.find((advisor) => advisor.id === advisorId)
          if (ret) {
            return ret
          } else {
            throw new Error("no record find")
          }
        })
      },
      applyAdvisor(params: { advisorId: string }): Promise<void> {
        return delay(1000).then((_d) => {
          // update advisor status
          const idx = advicesCache.findIndex(
            (advisor) => advisor.id === params.advisorId,
          )
          if (idx >= 0) {
            advicesCache[idx] = { ...advicesCache[idx], state: "APPLIED" }
          }
          // return d
        })
      },
      closeAdvisor(params: { advisorId: string }): Promise<void> {
        return delay(1000).then((_d) => {
          // update advisor status
          const idx = advicesCache.findIndex(
            (advisor) => advisor.id === params.advisorId,
          )
          if (idx >= 0) {
            advicesCache[idx] = { ...advicesCache[idx], state: "CLOSED" }
          }
          // return d
        })
      },
      deleteAdvisor(_params: { advisorId: string }): Promise<void> {
        return delay(1000).then(() => {})
      },
      genAdvisor(_params: { sql: string }): Promise<GenAdvisorRes> {
        return delay(1000).then(() => {
          return {
            text: `create index concurrently category_id_idx on product_catalog(category_id)`,
            base_resp: {},
          }
        })
      },
    },
  }
}
