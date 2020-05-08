import React from 'react'
import { Tooltip } from 'antd'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import { max } from 'lodash'
import { getValueFormat } from '@baurine/grafana-value-formats'
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

const DEF_TRANSKEY_PREFIX = 'component.commonColumn.'

function TransText({ transKey }: { transKey: string }) {
  const { t } = useTranslation()
  return <span>{t(transKey, '')}</span>
}

export function dummyColumn(): IColumn {
  return {
    name: '',
    key: 'dummy',
    minWidth: 28,
    maxWidth: 28,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (_rec) => null,
  }
}

function fieldsKeyColumn(transKeyPrefix: string): IColumn {
  return {
    name: (<TransText transKey={`${DEF_TRANSKEY_PREFIX}name`} />) as any,
    key: 'key',
    minWidth: 150,
    maxWidth: 250,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => {
      if (rec.keyDisplay) {
        return rec.keyDisplay
      }
      return <TransText transKey={`${transKeyPrefix}${rec.key}`} />
    },
  }
}

function fieldsValueColumn(): IColumn {
  return {
    name: (<TransText transKey={`${DEF_TRANSKEY_PREFIX}value`} />) as any,
    key: 'value',
    fieldName: 'value',
    minWidth: 150,
    maxWidth: 250,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
  }
}

function fieldsTimeValueColumn(
  rows?: { avg?: number; min?: number; max?: number; value?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => max([v.max, v.min, v.avg, v.value]))) ?? 0
    : 0
  return {
    name: (<TransText transKey={`${DEF_TRANSKEY_PREFIX}time`} />) as any,
    key: 'time',
    minWidth: 150,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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
          value={rec.avg ?? rec.value}
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

function fieldsDescriptionColumn(transKeyPrefix: string): IColumn {
  return {
    name: (<TransText transKey={`${DEF_TRANSKEY_PREFIX}desc`} />) as any,
    key: 'description',
    minWidth: 150,
    maxWidth: 300,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => {
      return <TransText transKey={`${transKeyPrefix}${rec.key}_tooltip`} />
    },
  }
}

////////////////////////////////////////////

export function valueColumns(transKeyPrefix: string) {
  return [
    fieldsKeyColumn(transKeyPrefix),
    fieldsValueColumn(),
    fieldsDescriptionColumn(transKeyPrefix),
  ]
}

export function timeValueColumns(
  transKeyPrefix: string,
  items?: { avg?: number; min?: number; max?: number; value?: number }[]
) {
  return [
    fieldsKeyColumn(transKeyPrefix),
    fieldsTimeValueColumn(items),
    fieldsDescriptionColumn(transKeyPrefix),
  ]
}
