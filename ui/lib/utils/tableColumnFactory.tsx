import { Tooltip } from 'antd'
import { max as _max, capitalize } from 'lodash'
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
import { UtilsTableSchema } from '@lib/client'

export type DerivedField<T> = {
  displayTransKey?: string // it is same as avg field name default
  sources: T[]
}

export type DerivedBar = DerivedField<{
  tooltipPrefix: string
  fieldName: string
}>

export type DerivedCol = DerivedField<string>

export function formatVal(val: number, unit: string, decimals: number = 1) {
  const formatFn = getValueFormat(unit)
  return unit === 'short' ? formatFn(val, 0, decimals) : formatFn(val, decimals)
}

export function commonColumnName(transPrefix: string, fieldName: string): any {
  const fullTransKey = `${transPrefix}.${fieldName}`
  return <TextWithInfo.TransKey transKey={fullTransKey} />
}

interface Configurable {
  setConfig(config: Partial<IColumn>): TableColumnFactory
}

export class TableColumnFactory implements Configurable {
  bar: BarColumn = new BarColumn(this)

  private currentConfig: Partial<IColumn> = {}
  private schemaFieldsMap: { [f: string]: boolean }

  constructor(
    private transPrefix: string,
    private schemaFields: UtilsTableSchema[] = []
  ) {
    this.schemaFieldsMap = schemaFields
      .map((f) => f.field!.toLowerCase())
      .reduce((prev, f) => {
        prev[f] = true
        return prev
      }, {} as { [f: string]: boolean })
  }

  setConfig(config: Partial<IColumn>) {
    const c = this.currentConfig
    this.currentConfig = { ...c, ...config }
    return this
  }

  column(column: IColumn): IColumn {
    const combinedConfig = {
      ...column,
      ...this.currentConfig,
    }
    this.currentConfig = {}
    return {
      ...combinedConfig,
      // translate name
      name: commonColumnName(this.transPrefix, combinedConfig.name),
    }
  }

  columns(...columns: IColumn[]): IColumn[] {
    const needFilterColumnBySchema = this.schemaFields.length
    if (!needFilterColumnBySchema) {
      return columns
    }
    return columns.filter((c) => this.schemaFieldsMap[c.fieldName!])
  }

  textWithTooltip<T extends string, U extends { [K in T]?: any }>(
    fieldName: T,
    _rows?: U[]
  ): IColumn {
    return this.column({
      ...this.columnFromField(fieldName),
      minWidth: 100,
      maxWidth: 150,
      onRender: (rec: U) => (
        <Tooltip title={rec[fieldName]}>
          <TextWrap>{rec[fieldName]}</TextWrap>
        </Tooltip>
      ),
    })
  }

  singleBar<T extends string, U extends { [K in T]?: number }>(
    fieldName: T,
    unit: string,
    rows?: U[]
  ): IColumn {
    const capacity = rows ? _max(rows.map((v) => v[fieldName])) ?? 0 : 0
    return this.column({
      ...this.columnFromField(fieldName),
      minWidth: 140,
      maxWidth: 200,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec: U) => {
        const fmtVal = formatVal(rec[fieldName]!, unit)
        return (
          <Bar textWidth={70} value={rec[fieldName]!} capacity={capacity}>
            {fmtVal}
          </Bar>
        )
      },
    })
  }

  multipleBar<T>(barsConfig: DerivedBar, unit: string, rows?: T[]): IColumn {
    const {
      displayTransKey,
      sources: [avg, max, min],
    } = barsConfig

    const tooltipPrefixLens: number[] = []

    tooltipPrefixLens.push(avg.tooltipPrefix.length)
    tooltipPrefixLens.push(max.tooltipPrefix.length)
    if (min) {
      tooltipPrefixLens.push(min.tooltipPrefix.length)
    }

    const maxTooltipPrefixLen = _max(tooltipPrefixLens) || 0

    const capacity = rows ? _max(rows.map((v) => v[max.fieldName])) ?? 0 : 0

    return this.column({
      ...this.columnFromField(avg.fieldName),
      name: displayTransKey || avg.fieldName,
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
              capacity={capacity as number}
            >
              {formatVal(avgVal, unit)}
            </Bar>
          </Tooltip>
        )
      },
    })
  }

  timestamp<T extends string, U extends { [K in T]?: number }>(
    fieldName: T,
    _rows?: U[]
  ): IColumn {
    return this.column({
      ...this.columnFromField(fieldName),
      minWidth: 100,
      maxWidth: 150,
      columnActionsMode: ColumnActionsMode.clickable,
      onRender: (rec: U) => (
        <TextWrap>
          <DateTime.Calendar unixTimestampMs={rec[fieldName]! * 1000} />
        </TextWrap>
      ),
    })
  }

  sqlText<T extends string, U extends { [K in T]?: string }>(
    fieldName: T,
    showFullSQL?: boolean,
    _rows?: U[]
  ): IColumn {
    return this.column({
      ...this.columnFromField(fieldName),
      minWidth: 100,
      maxWidth: 500,
      isMultiline: showFullSQL,
      onRender: (rec: U) =>
        showFullSQL ? (
          <TextWrap multiline>
            <HighlightSQL sql={rec[fieldName]!} />
          </TextWrap>
        ) : (
          <Tooltip
            title={<HighlightSQL sql={rec[fieldName]!} theme="dark" />}
            placement="right"
          >
            <TextWrap>
              <HighlightSQL sql={rec[fieldName]!} compact />
            </TextWrap>
          </Tooltip>
        ),
    })
  }

  private columnFromField(fieldName: string) {
    return {
      name: fieldName,
      key: fieldName,
      fieldName: fieldName,
    }
  }
}

export class BarColumn implements Configurable {
  constructor(public factory: TableColumnFactory) {}

  setConfig(config: Partial<IColumn>) {
    return this.factory.setConfig(config)
  }

  single<T extends string, U extends { [K in T]?: number }>(
    fieldName: T,
    unit: string,
    rows?: U[]
  ) {
    return this.factory.singleBar(fieldName, unit, rows)
  }

  multiple<T>(bars: DerivedBar, unit: string, rows?: T[]) {
    return this.factory.multipleBar(bars, unit, rows)
  }
}

////////////////////////////////////////////

export type DerivedFields = Record<
  string,
  DerivedBar['sources'] | DerivedCol['sources']
>

export function genDerivedBarSources(
  avg: string,
  max: string,
  min?: string
): DerivedBar['sources'] {
  const res = [
    {
      tooltipPrefix: 'mean',
      fieldName: avg,
    },
    {
      tooltipPrefix: 'max',
      fieldName: max,
    },
  ]
  if (min) {
    res.push({
      tooltipPrefix: 'min',
      fieldName: min,
    })
  }
  return res
}

function isDerivedBarSources(v: any): v is DerivedBar['sources'] {
  return !!v[0].fieldName
}

export function getSelectedFields(
  visibleColumnKeys: IColumnKeys,
  derivedFields: DerivedFields
) {
  let fields: string[] = []
  let sources: DerivedFields[keyof DerivedFields]
  for (const columnKey in visibleColumnKeys) {
    if (visibleColumnKeys[columnKey]) {
      if ((sources = derivedFields[columnKey])) {
        if (isDerivedBarSources(sources)) {
          fields.push(...sources.map((b) => b.fieldName))
        } else {
          fields.push(...sources)
        }
      } else {
        fields.push(columnKey)
      }
    }
  }
  return fields
}
