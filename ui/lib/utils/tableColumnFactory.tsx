import { Tooltip } from 'antd'
import { max as _max } from 'lodash'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import {
  Bar,
  Pre,
  TextWithInfo,
  TextWrap,
  DateTime,
  HighlightSQL,
} from '@lib/components'

type BarField = { fieldName: string; tooltipPrefix: string }
type Bars = {
  displayTransKey?: string // it is same as avg.fieldName default
  avg: BarField
  max: BarField
  min?: BarField
}

function formatVal(unit: string, val: number) {
  const formatFn = getValueFormat(unit)
  return unit === 'short' ? formatFn(val, 0, 1) : formatFn(val, 1)
}

export class TableColumnFactory {
  transPrefix: string
  bar: BarColumn

  constructor(transKeyPrefix: string) {
    this.transPrefix = transKeyPrefix
    this.bar = new BarColumn(this)
  }

  commonColumnName(fieldName: string): any {
    const fullTransKey = `${this.transPrefix}.${fieldName}`
    return <TextWithInfo.TransKey transKey={fullTransKey} />
  }

  textWithTooltip(fieldName: string): IColumn {
    return {
      name: this.commonColumnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 100,
      maxWidth: 150,
      onRender: (rec) => (
        <Tooltip title={rec[fieldName]}>
          <TextWrap>{rec[fieldName]}</TextWrap>
        </Tooltip>
      ),
    }
  }

  singleBar(fieldName: string, unit: string, rows?: any[]): IColumn {
    const capacity = rows ? _max(rows.map((v) => v[fieldName])) ?? 0 : 0
    return {
      name: this.commonColumnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 140,
      maxWidth: 200,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec) => {
        const fmtVal = formatVal(unit, rec[fieldName])
        return (
          <Bar textWidth={70} value={rec[fieldName]} capacity={capacity}>
            {fmtVal}
          </Bar>
        )
      },
    }
  }

  multipleBar(unit: string, bars: Bars, rows?: any[]): IColumn {
    const { displayTransKey, avg, max, min } = bars
    const capacity = rows ? _max(rows.map((v) => v[max.fieldName])) ?? 0 : 0
    return {
      name: this.commonColumnName(displayTransKey || avg.fieldName),
      key: avg.fieldName,
      fieldName: avg.fieldName,
      minWidth: 140,
      maxWidth: 200,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec) => {
        const avgVal = rec[avg.fieldName]
        const maxVal = rec[max.fieldName]
        const minVal = min ? rec[min.fieldName] : undefined
        const tooltips = [avg, min, max]
          .filter((el) => el !== undefined)
          .map(
            (bar) =>
              `${bar!.tooltipPrefix} ${formatVal(unit, rec[bar!.fieldName])}`
          )
          .join('\n')
        return (
          <Tooltip title={<Pre>{tooltips.trim()}</Pre>}>
            <Bar
              textWidth={70}
              value={avgVal}
              max={maxVal}
              min={minVal}
              capacity={capacity}
            >
              {formatVal(unit, avgVal)}
            </Bar>
          </Tooltip>
        )
      },
    }
  }

  timestampColumn(fieldName: string): IColumn {
    return {
      name: this.commonColumnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 100,
      maxWidth: 150,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec) => (
        <TextWrap>
          <DateTime.Calendar unixTimestampMs={rec[fieldName] * 1000} />
        </TextWrap>
      ),
    }
  }

  sqlTextColumn(fieldName: string, showFullSQL?: boolean): IColumn {
    return {
      name: this.commonColumnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 100,
      maxWidth: 500,
      isMultiline: showFullSQL,
      onRender: (rec) =>
        showFullSQL ? (
          <TextWrap multiline>
            <HighlightSQL sql={rec[fieldName]} />
          </TextWrap>
        ) : (
          <Tooltip
            title={<HighlightSQL sql={rec[fieldName]} theme="dark" />}
            placement="right"
          >
            <TextWrap>
              <HighlightSQL sql={rec[fieldName]} compact />
            </TextWrap>
          </Tooltip>
        ),
    }
  }

  planColumn(fieldName: string): IColumn {
    return {
      name: this.commonColumnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 100,
      maxWidth: 150,
      onRender: (rec) => (
        <Tooltip title={<Pre noWrap>{rec[fieldName]}</Pre>}>
          <TextWrap>{rec[fieldName]}</TextWrap>
        </Tooltip>
      ),
    }
  }
}

export class BarColumn {
  constructor(public factory: TableColumnFactory) {}

  single(fieldName: string, unit: string, rows?: any[]) {
    return this.factory.singleBar(fieldName, unit, rows)
  }

  multiple(unit: string, bars: Bars, rows?: any[]) {
    return this.factory.multipleBar(unit, bars, rows)
  }
}
