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
import { addTranslationResource } from './i18n'

const translations = {
  en: {
    name: 'Name',
    value: 'Value',
    time: 'Time',
    desc: 'Description',
  },
  'zh-CN': {
    name: '名称',
    value: '值',
    time: '时间',
    desc: '描述',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      commonColumn: translations[key],
    },
  })
}

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
    name: t('component.commonColumn.name'),
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
  const { t } = useTranslation()
  return {
    name: t('component.commonColumn.value'),
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
  const { t } = useTranslation()
  const capacity = rows
    ? max(rows.map((v) => max([v.max, v.min, v.avg]))) ?? 0
    : 0
  return {
    name: t('component.commonColumn.time'),
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
    name: t('component.commonColumn.desc'),
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
