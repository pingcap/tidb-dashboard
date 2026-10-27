import React, { useLayoutEffect, useMemo, useState } from 'react'

import { CSVHeader, serializeCSV } from '@lib/utils/csv'

interface CSVDownloadLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  data: readonly object[]
  headers: readonly CSVHeader[]
  filename: string
}

export default function CSVDownloadLink({
  data,
  headers,
  filename,
  children,
  onClick,
  ...props
}: CSVDownloadLinkProps) {
  const csv = useMemo(() => serializeCSV(data, headers), [data, headers])
  const [blobURL, setBlobURL] = useState<{ csv: string; url: string }>()
  const filenameWithExtension = filename.endsWith('.csv')
    ? filename
    : `${filename}.csv`

  useLayoutEffect(() => {
    if (typeof URL === 'undefined' || !URL.createObjectURL) {
      return
    }

    const urlAPI = URL
    const url = urlAPI.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    )
    setBlobURL({ csv, url })
    return () => urlAPI.revokeObjectURL(url)
  }, [csv])

  const href =
    blobURL?.csv === csv
      ? blobURL.url
      : typeof URL === 'undefined' || !URL.createObjectURL
      ? `data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFF' + csv)}`
      : undefined

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || typeof window === 'undefined') {
      return
    }

    const navigator = window.navigator as Navigator & {
      msSaveBlob?: (blob: Blob, defaultName?: string) => boolean
    }
    if (navigator.msSaveBlob) {
      event.preventDefault()
      navigator.msSaveBlob(
        new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
        filenameWithExtension
      )
    }
  }

  return (
    <a
      {...props}
      href={href}
      download={filenameWithExtension}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
