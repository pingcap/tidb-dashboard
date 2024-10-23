import { TOptions } from "i18next"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

export function useTn() {
  const { t } = useTranslation()

  const tn = useCallback(
    (i18nKey: string, defVal: string, options?: TOptions) => {
      return t(i18nKey, defVal, options)
    },
    [t],
  )
  const ret = useMemo(() => {
    return { tn }
  }, [tn])

  return ret
}
