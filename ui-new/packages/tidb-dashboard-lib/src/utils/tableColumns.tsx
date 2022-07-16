import { Tooltip } from 'antd'
import { max } from 'lodash'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { Bar, Pre } from '@lib/components'
import { addTranslationResource } from './i18n'
import { TranslatedColumnName } from './tableColumnFactory'

const translations = {
  en: {
    name: 'Name',
    value: 'Value',
    time: 'Time',
    desc: 'Description'
  },
  zh: {
    name: '名称',
    value: '值',
    time: '时间',
    desc: '描述'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      commonColumn: translations[key]
    }
  })
}

function TransText({
  transKey,
  noFallback
}: {
  transKey: string
  noFallback?: boolean
}) {
  const { t } = useTranslation()
  let opt
  if (noFallback) {
    opt = {
      defaultValue: '',
      fallbackLng: '_'
    }
  }
  return <span>{t(transKey, opt)}</span>
}

////////////////////////////////////
const TRANS_KEY_PREFIX = 'component.commonColumn'

function fieldsKeyColumn(transKeyPrefix: string): IColumn {
  return {
    name: TranslatedColumnName(TRANS_KEY_PREFIX, 'name'),
    key: 'key',
    minWidth: 150,
    maxWidth: 250,
    onRender: (rec) => {
      return (
        <div style={{ paddingLeft: (rec.indentLevel || 0) * 24 }}>
          {rec.keyDisplay ?? (
            <TransText transKey={`${transKeyPrefix}${rec.key}`} />
          )}
        </div>
      )
    }
  }
}

function fieldsValueColumn(): IColumn {
  return {
    name: TranslatedColumnName(TRANS_KEY_PREFIX, 'value'),
    key: 'value',
    fieldName: 'value',
    minWidth: 150,
    maxWidth: 250
  }
}

function fieldsTimeValueColumn(
  rows?: { avg?: number; min?: number; max?: number; value?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => max([v.max, v.min, v.avg, v.value]))) ?? 0
    : 0
  return {
    name: TranslatedColumnName(TRANS_KEY_PREFIX, 'time'),
    key: 'time',
    minWidth: 150,
    maxWidth: 200,
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
    }
  }
}

function fieldsDescriptionColumn(transKeyPrefix: string): IColumn {
  return {
    name: TranslatedColumnName(TRANS_KEY_PREFIX, 'desc'),
    key: 'description',
    minWidth: 150,
    maxWidth: 300,
    onRender: (rec) => {
      const content = (
        <TransText
          transKey={`${transKeyPrefix}${rec.key}_tooltip`}
          noFallback
        />
      )
      return (
        <Tooltip title={content}>
          <span>{content}</span>
        </Tooltip>
      )
    }
  }
}

////////////////////////////////////////////

export function valueColumns(transKeyPrefix: string) {
  return [
    fieldsKeyColumn(transKeyPrefix),
    fieldsValueColumn(),
    fieldsDescriptionColumn(transKeyPrefix)
  ]
}

export function timeValueColumns(
  transKeyPrefix: string,
  items?: { avg?: number; min?: number; max?: number; value?: number }[]
) {
  return [
    fieldsKeyColumn(transKeyPrefix),
    fieldsTimeValueColumn(items),
    fieldsDescriptionColumn(transKeyPrefix)
  ]
}
