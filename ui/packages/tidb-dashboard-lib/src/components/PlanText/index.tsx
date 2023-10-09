import React, { useMemo } from 'react'
import { CopyLink, TxtDownloadLink, Pre } from '@lib/components'

type BinaryPlanTextProps = {
  data: string
  downloadFileName: string
}

// mysql> select tidb_decode_binary_plan("AgQgAQ==");
// +-------------------------------------+
// | tidb_decode_binary_plan("AgQgAQ==") |
// +-------------------------------------+
// | (plan discarded because too long)   |
// +-------------------------------------+
// 1 row in set (0.00 sec)

const DISCARDED_TOO_LONG = 'plan discarded because too long'

const MAX_SHOW_LEN = 500 * 1024 // 500KB

export const PlanText: React.FC<BinaryPlanTextProps> = ({
  data,
  downloadFileName
}) => {
  const discardedDueToTooLong = useMemo(() => {
    return data
      .slice(0, DISCARDED_TOO_LONG.length + 10)
      .includes(DISCARDED_TOO_LONG)
  }, [data])

  const truncatedStr = useMemo(() => {
    let str = data
    if (str.length > MAX_SHOW_LEN) {
      str =
        str.slice(0, MAX_SHOW_LEN) +
        '\n...(too long to show, copy or download to analyze)'
    }
    // binary_plan_text field starts with '\n' which will show an extra empty line
    // plan field starts with `\t`
    if (str.startsWith('\n')) {
      // remove the first empty line
      str = str.slice(1)
    }
    return str
  }, [data])

  if (discardedDueToTooLong) {
    return <div>{data}</div>
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 16 }}>
        <CopyLink data={data} />
        <TxtDownloadLink data={data} fileName={downloadFileName} />
      </div>
      <Pre noWrap style={{ paddingBlock: 8 }}>
        {truncatedStr}
      </Pre>
    </>
  )
}
