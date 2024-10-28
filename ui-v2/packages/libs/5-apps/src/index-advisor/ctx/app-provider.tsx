import { IndexAdvisorContext, IndexAdvisorCtxValue } from "./context"

export function IndexAdvisorProvider(props: {
  children: React.ReactNode
  ctxValue: IndexAdvisorCtxValue
}) {
  return (
    <IndexAdvisorContext.Provider value={props.ctxValue}>
      {props.children}
    </IndexAdvisorContext.Provider>
  )
}
