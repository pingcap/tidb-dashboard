import React, { useMemo } from 'react'
import { QueryeditorRunResponse } from '@lib/client'
import { CardTable } from '@lib/components'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'

import styles from './ResultTable.module.less'

interface IResultTableProps {
  results?: QueryeditorRunResponse
}

function ResultTable({ results }: IResultTableProps) {
  const columns: IColumn[] = useMemo(() => {
    if (!results) {
      return []
    }
    if (results.error_msg) {
      return [
        {
          name: 'Error',
          key: 'error',
          minWidth: 100,
          fieldName: 'error',
          isMultiline: true
        }
      ]
    } else {
      return (results.column_names ?? []).map((cn, idx) => ({
        name: cn,
        key: cn,
        minWidth: 200,
        maxWidth: 500,
        fieldName: String(idx)
      }))
    }
  }, [results])

  const items = useMemo(() => {
    if (!results) {
      return []
    }
    if (results.error_msg) {
      return [{ error: results.error_msg }]
    } else {
      return results.rows ?? []
    }
  }, [results])

  return (
    <div className={styles.resultTable}>
      <ScrollablePane>
        <CardTable
          cardNoMarginTop
          extendLastColumn
          columns={columns}
          items={items}
        />
      </ScrollablePane>
    </div>
  )
}

export default ResultTable
