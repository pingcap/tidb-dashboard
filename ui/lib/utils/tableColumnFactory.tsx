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
  IColumnKeys,
} from '@lib/components'

type Bar = { [key: string]: string }
type BarsConfig = {
  displayTransKey?: string // it is same as avg field name default
  bars: [Bar, Bar, Bar?] // [avg, max, min?]
}

export type IExtendColumn = IColumn & {
  refFields?: string[]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatVal(val: number, unit: string) {
  const formatFn = getValueFormat(unit)
  return unit === 'short' ? formatFn(val, 0, 1) : formatFn(val, 1)
}

export function commonColumnName(transPrefix: string, fieldName: string): any {
  const fullTransKey = `${transPrefix}.${fieldName}`
  return <TextWithInfo.TransKey transKey={fullTransKey} />
}

export class TableColumnFactory {
  transPrefix: string
  bar: BarColumn

  constructor(transKeyPrefix: string) {
    this.transPrefix = transKeyPrefix
    this.bar = new BarColumn(this)
  }

  columnName(fieldName: string): any {
    return commonColumnName(this.transPrefix, fieldName)
  }

  textWithTooltip(fieldName: string): IExtendColumn {
    return {
      name: this.columnName(fieldName),
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

  singleBar(fieldName: string, unit: string, rows?: any[]): IExtendColumn {
    const capacity = rows ? _max(rows.map((v) => v[fieldName])) ?? 0 : 0
    return {
      name: this.columnName(fieldName),
      key: fieldName,
      fieldName: fieldName,
      minWidth: 140,
      maxWidth: 200,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec) => {
        const fmtVal = formatVal(rec[fieldName], unit)
        return (
          <Bar textWidth={70} value={rec[fieldName]} capacity={capacity}>
            {fmtVal}
          </Bar>
        )
      },
    }
  }

  multipleBar(
    barsConfig: BarsConfig,
    unit: string,
    rows?: any[]
  ): IExtendColumn {
    const {
      displayTransKey,
      bars: [avg_, max_, min_],
    } = barsConfig

    const tooltioPrefixLens: number[] = []
    const avg = {
      fieldName: Object.values(avg_)[0],
      tooltipPrefix: Object.keys(avg_)[0],
    }
    tooltioPrefixLens.push(avg.tooltipPrefix.length)
    const max = {
      fieldName: Object.values(max_)[0],
      tooltipPrefix: Object.keys(max_)[0],
    }
    tooltioPrefixLens.push(max.tooltipPrefix.length)
    let min
    if (min_) {
      min = {
        fieldName: Object.values(min_)[0],
        tooltipPrefix: Object.keys(min_)[0],
      }
      tooltioPrefixLens.push(min.tooltipPrefix.length)
    } else {
      min = undefined
    }
    const maxTooltipPrefixLen = _max(tooltioPrefixLens) || 0

    const capacity = rows ? _max(rows.map((v) => v[max.fieldName])) ?? 0 : 0
    let refFields = [avg.fieldName, max.fieldName]
    if (min) {
      refFields.push(min.fieldName)
    }
    return {
      name: this.columnName(displayTransKey || avg.fieldName),
      key: avg.fieldName,
      fieldName: avg.fieldName,
      refFields,
      minWidth: 140,
      maxWidth: 200,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec) => {
        const avgVal = rec[avg.fieldName]
        const maxVal = rec[max.fieldName]
        const minVal = min ? rec[min.fieldName] : undefined
        const tooltips = [avg, min, max]
          .filter((el) => el !== undefined)
          .map((bar) => {
            const prefix = capitalize(bar!.tooltipPrefix + ':').padEnd(
              maxTooltipPrefixLen + 2
            )
            const fmtVal = formatVal(rec[bar!.fieldName], unit)
            return `${prefix}${fmtVal}`
          })
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
              {formatVal(avgVal, unit)}
            </Bar>
          </Tooltip>
        )
      },
    }
  }

  timestamp(fieldName: string): IExtendColumn {
    return {
      name: this.columnName(fieldName),
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

  sqlText(fieldName: string, showFullSQL?: boolean): IExtendColumn {
    return {
      name: this.columnName(fieldName),
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

  plan(fieldName: string): IExtendColumn {
    return {
      name: this.columnName(fieldName),
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

  multiple(bars: BarsConfig, unit: string, rows?: any[]) {
    return this.factory.multipleBar(bars, unit, rows)
  }
}

////////////////////////////////////////////

export function getSelectedFields(
  visibleColumnKeys: IColumnKeys,
  columns: IExtendColumn[]
) {
  let fields: string[] = []
  columns.forEach((c) => {
    if (visibleColumnKeys[c.key] === true) {
      if (c.refFields !== undefined) {
        fields = fields.concat(c.refFields)
      } else {
        fields.push(c.key)
      }
    }
  })
  return fields
}
