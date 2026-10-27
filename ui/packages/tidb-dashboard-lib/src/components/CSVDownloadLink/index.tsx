import React, { useEffect, useMemo } from 'react'

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
  ...props
}: CSVDownloadLinkProps) {
  const csv = useMemo(() => serializeCSV(data, headers), [data, headers])
  const url = useMemo(() => {
    if (typeof URL === 'undefined' || !URL.createObjectURL) {
      return undefined
    }
    return URL.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    )
  }, [csv])

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [url])

  return (
    <a
      {...props}
      href={url}
      download={filename.endsWith('.csv') ? filename : `${filename}.csv`}
    >
      {children}
    </a>
  )
}
