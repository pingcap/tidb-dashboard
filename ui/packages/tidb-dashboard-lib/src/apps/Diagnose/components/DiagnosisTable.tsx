import { Button } from 'antd'
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext
} from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingOutlined } from '@ant-design/icons'

import { DiagnoseTableDef } from '@lib/client'
import { CardTable, DateTime } from '@lib/components'
import { useClientRequest, RequestFactory } from '@lib/utils/useClientRequest'

import { diagnosisColumns } from '../utils/tableColumns'
import { DiagnoseContext } from '../context'

// FIXME: use better naming
// stableTimeRange: used to start diagnosing when triggering by clicking "Start" outside this component
// unstableTimeRange: used to start diagnosing when triggering by clicking "Start" inside this component
export interface IDiagnosisTableProps {
  stableTimeRange: [number, number]
  unstableTimeRange: [number, number]
  kind: string
}

type ReqFnType = RequestFactory<DiagnoseTableDef>

// Modified from SearchResult.tsx
function Row({ renderer, props }) {
  const [expanded, setExpanded] = useState(false)
  const handleClick = useCallback(() => {
    setExpanded((v) => !v)
  }, [])

  // https://stackoverflow.com/questions/53623294/how-to-conditionally-change-a-color-of-a-row-in-detailslist
  const backgroundColor = props.item.is_sub ? 'lightcyan' : 'inhert'
  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      {renderer({
        ...props,
        styles: { root: { backgroundColor } },
        item: { ...props.item, expanded }
      })}
    </div>
  )
}

export default function DiagnosisTable({
  stableTimeRange,
  unstableTimeRange,
  kind
}: IDiagnosisTableProps) {
  const ctx = useContext(DiagnoseContext)

  const { t } = useTranslation()

  const [internalTimeRange, setInternalTimeRange] = useState<[number, number]>([
    0, 0
  ])
  useEffect(() => setInternalTimeRange(stableTimeRange), [stableTimeRange])
  function handleStart() {
    setInternalTimeRange(unstableTimeRange)
  }
  const timeChanged = useMemo(
    () =>
      internalTimeRange[0] !== unstableTimeRange[0] ||
      internalTimeRange[1] !== unstableTimeRange[1],
    [internalTimeRange, unstableTimeRange]
  )

  const reqFn = useRef<ReqFnType | null>(null)
  useEffect(() => {
    reqFn.current = (reqConfig) =>
      ctx!.ds.diagnoseDiagnosisPost(
        {
          start_time: internalTimeRange[0],
          end_time: internalTimeRange[1],
          kind
        },
        reqConfig
      )
  }, [internalTimeRange, kind, ctx])

  const { data, isLoading, error, sendRequest } = useClientRequest(
    reqFn.current!,
    { immediate: false }
  )

  useEffect(() => {
    if (internalTimeRange[0] !== 0) {
      sendRequest()
    }
  }, [internalTimeRange, sendRequest])

  ////////////////

  const allRows = useMemo(() => {
    const _columnHeaders =
      data?.column?.map((col) => col.toLocaleLowerCase()) || []
    let _rows: any[] = []
    data?.rows?.forEach((row, rowIdx) => {
      // values (array)
      let _newRow = { row_idx: rowIdx, is_sub: false, show_sub: false }
      row.values?.forEach((v, v_idx) => {
        const key = _columnHeaders[v_idx]
        _newRow[key] = v
      })

      // subvalues (2 demensional array)
      let _subRows: any[] = []
      row.sub_values?.forEach((sub_v) => {
        let _subRow = { row_idx: rowIdx, is_sub: true }
        sub_v.forEach((v, idx) => {
          const key = _columnHeaders[idx]
          _subRow[key] = v
        })
        _subRows.push(_subRow)
      })

      _newRow['sub_rows'] = _subRows
      _rows.push(_newRow)
    })
    return _rows
  }, [data])

  const [items, setItems] = useState(allRows)
  useEffect(() => {
    setItems(allRows)
  }, [allRows])

  const toggleShowSub = useCallback(
    (rowIdx, showSub) => {
      let newRows = [...items]
      let curRowPos = newRows.findIndex(
        (el) => el.row_idx === rowIdx && el.is_sub === false
      )
      if (curRowPos === -1) {
        return
      }
      let curRow = newRows[curRowPos]

      // update status
      curRow.show_sub = showSub
      if (showSub) {
        // insert sub rows
        newRows.splice(curRowPos + 1, 0, ...curRow.sub_rows)
      } else {
        // remove sub rows
        newRows.splice(curRowPos + 1, curRow.sub_rows.length)
      }
      setItems(newRows)
    },
    [items]
  )

  const columns = useMemo(
    () => diagnosisColumns(items, toggleShowSub),
    [items, toggleShowSub]
  )

  ////////////////

  const renderRow = useCallback((props, defaultRender) => {
    if (!props) {
      return null
    }
    return <Row renderer={defaultRender!} props={props} />
  }, [])

  ////////////////

  function cardExtra() {
    if (isLoading) {
      return <LoadingOutlined />
    }
    if (timeChanged || error) {
      return (
        <Button onClick={handleStart}>{t('diagnose.generate.submit')}</Button>
      )
    }
    return null
  }

  function subTitle() {
    if (internalTimeRange[0] > 0) {
      return (
        <span>
          <DateTime.Calendar unixTimestampMs={internalTimeRange[0] * 1000} /> ~{' '}
          <DateTime.Calendar unixTimestampMs={internalTimeRange[1] * 1000} />
        </span>
      )
    }
    return null
  }

  return (
    <CardTable
      title={t(`diagnose.table_title.${kind}_diagnosis`)}
      subTitle={subTitle()}
      cardExtra={cardExtra()}
      errors={[error]}
      columns={columns}
      items={items}
      onRenderRow={renderRow}
      extendLastColumn
    />
  )
}
