import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type UrlStateCtxValue = {
  urlQuery: string
  setUrlQuery: (v: string) => void
}

const UrlStateContext = createContext<UrlStateCtxValue | null>(null)

const useUrlStateContext = () => {
  const context = useContext(UrlStateContext)

  if (!context) {
    throw new Error("useUrlStateContext must be used within a UrlStateProvider")
  }

  return context
}

function defCtxVal(): UrlStateCtxValue {
  return {
    urlQuery: new URL(window.location.href).search,
    setUrlQuery(p) {
      const url = new URL(window.location.href)
      window.history.replaceState({}, "", `${url.pathname}?${p}`)
    },
  }
}

export function UrlStateProvider(props: {
  children: React.ReactNode
  value?: UrlStateCtxValue
}) {
  const val: UrlStateCtxValue = props.value || defCtxVal()

  const [urlQuery, _setUrlQuery] = useState(val.urlQuery)

  // UrlStateProvider is designed to each page has its own provider instance,
  // won't share between pages
  // so we don't need to sync urlQuery from props
  // -------------------
  // sync urlQuery from props changes
  // useEffect(() => {
  //   _setUrlQuery(val.urlQuery)
  // }, [val.urlQuery])

  const ctxValue = useMemo(
    () => ({
      urlQuery,
      setUrlQuery: (v: string) => {
        val.setUrlQuery(v)
        // trigger re-render
        _setUrlQuery(v)
      },
    }),
    [urlQuery, val],
  )

  return (
    <UrlStateContext.Provider value={ctxValue}>
      {props.children}
    </UrlStateContext.Provider>
  )
}

//----------------------

type UrlState = Partial<Record<string, string>>
type UrlStateObj<T extends UrlState = UrlState> = {
  [key in keyof T]: string
}

export function useUrlState<T extends UrlState = UrlState>(): [
  UrlStateObj<T>,
  (s: UrlStateObj<T>) => void,
] {
  const { urlQuery, setUrlQuery } = useUrlStateContext()

  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams(urlQuery)
    const paramsObj: Record<string, string> = {}
    searchParams.forEach((v, k) => {
      paramsObj[k] = v
    })
    return paramsObj as UrlStateObj<T>
  }, [urlQuery])

  const setQueryParams = useCallback(
    (s: UrlStateObj<T>) => {
      const searchParams = new URLSearchParams(urlQuery)
      Object.keys(s).forEach((k) => {
        if (s[k]) {
          searchParams.set(k, s[k])
        } else {
          searchParams.delete(k)
        }
      })
      setUrlQuery(searchParams.toString())
    },
    [setUrlQuery, urlQuery],
  )

  return [queryParams, setQueryParams] as const
}
