import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import { max } from 'lodash'
import { getValueFormat } from '@baurine/grafana-value-formats'
import React from 'react'
import { Tooltip } from 'antd'
import { Pre, Bar } from '@lib/components'

export function useDummyColumn(): IColumn {
  return {
    name: '',
    key: 'dummy',
    minWidth: 28,
    maxWidth: 28,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => null,
  }
}

export function useFieldsKeyColumn(translationPrefix: string): IColumn {
  const { t } = useTranslation()
  return {
    name: 'Name',
    key: 'key',
    minWidth: 150,
    maxWidth: 250,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => {
      if (rec.keyDisplay) {
        return rec.keyDisplay
      }
      return t(`${translationPrefix}${rec.key}`)
    },
  }
}

export function useFieldsValueColumn(): IColumn {
  return {
    name: 'Value',
    key: 'value',
    fieldName: 'value',
    minWidth: 150,
    maxWidth: 250,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
  }
}

export function useFieldsTimeValueColumn(
  rows?: { avg?: number; min?: number; max?: number; value?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => max([v.max, v.min, v.avg]))) ?? 0
    : 0
  return {
    name: 'Time',
    key: 'time',
    minWidth: 150,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent: string[] = []
      if (rec.avg) {
        tooltipContent.push(`Mean: ${getValueFormat('ns')(rec.avg, 1)}`)
      }
      if (rec.min) {
        tooltipContent.push(`Min:  ${getValueFormat('ns')(rec.min, 1)}`)
      }
      if (rec.max) {
        tooltipContent.push(`Max:  ${getValueFormat('ns')(rec.max, 1)}`)
      }
      const bar = (
        <Bar
          textWidth={70}
          value={rec.avg}
          max={rec.max}
          min={rec.min}
          capacity={capacity}
        >
          {rec.avg != null
            ? getValueFormat('ns')(rec.avg, 1)
            : getValueFormat('ns')(rec.value, 1)}
        </Bar>
      )
      if (tooltipContent.length > 0) {
        return (
          <Tooltip title={<Pre>{tooltipContent.join('\n').trim()}</Pre>}>
            {bar}
          </Tooltip>
        )
      } else {
        return bar
      }
    },
  }
}

export function useFieldsDescriptionColumn(translationPrefix: string): IColumn {
  const { t } = useTranslation()
  return {
    name: 'Description',
    key: 'description',
    minWidth: 150,
    maxWidth: 300,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => {
      return t(`${translationPrefix}${rec.key}_tooltip`, '')
    },
  }
}
