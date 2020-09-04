import { Tooltip } from 'antd'
import { max } from 'lodash'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import {
  Bar,
  Pre,
  TextWithInfo,
  TextWrap,
  DateTime,
  IColumnKeys,
} from '@lib/components'
import { addTranslationResource } from './i18n'

const translations = {
  en: {
    name: 'Name',
    value: 'Value',
    time: 'Time',
    desc: 'Description',
  },
  zh: {
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

function TransText({
  transKey,
  noFallback,
}: {
  transKey: string
  noFallback?: boolean
}) {
  const { t } = useTranslation()
  let opt
  if (noFallback) {
    opt = {
      defaultValue: '',
      fallbackLng: '_',
    }
  }
  return <span>{t(transKey, opt)}</span>
}

export function commonColumnName(transPrefix: string, fieldName: string): any {
  const fullTransKey = `${transPrefix}.${fieldName}`
  return <TextWithInfo.TransKey transKey={fullTransKey} />
}

////////////////////////////////////
const TRANS_KEY_PREFIX = 'component.commonColumn'

function fieldsKeyColumn(transKeyPrefix: string): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'name'),
    key: 'key',
    minWidth: 150,
    maxWidth: 250,
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
    name: commonColumnName(TRANS_KEY_PREFIX, 'value'),
    key: 'value',
    fieldName: 'value',
    minWidth: 150,
    maxWidth: 250,
  }
}

function fieldsTimeValueColumn(
  rows?: { avg?: number; min?: number; max?: number; value?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => max([v.max, v.min, v.avg, v.value]))) ?? 0
    : 0
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'time'),
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
    },
  }
}

function fieldsDescriptionColumn(transKeyPrefix: string): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'desc'),
    key: 'description',
    minWidth: 150,
    maxWidth: 300,
    onRender: (rec) => {
      return (
        <TransText
          transKey={`${transKeyPrefix}${rec.key}_tooltip`}
          noFallback
        />
      )
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

////////////////////////////////////////////
// shared util column methods for statement tableColumns and slow query tableColumns

export function numWithBarColumn(
  transPrefix: string,
  columnName: string, // case-sensitive
  unit: string,
  rows?: any[]
): IColumn {
  const objFieldName = columnName.toLowerCase()
  const capacity = rows ? max(rows.map((v) => v[objFieldName])) ?? 0 : 0
  return {
    name: commonColumnName(transPrefix, objFieldName),
    key: columnName,
    fieldName: objFieldName,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const formatFn = getValueFormat(unit)
      const fmtVal =
        unit === 'short'
          ? formatFn(rec[objFieldName], 0, 1)
          : formatFn(rec[objFieldName], 1)
      return (
        <Bar textWidth={70} value={rec[objFieldName]} capacity={capacity}>
          {fmtVal}
        </Bar>
      )
    },
  }
}

export function textWithTooltipColumn(
  transPrefix: string,
  columnName: string // case-sensitive
): IColumn {
  const objFieldName = columnName.toLowerCase()
  return {
    name: commonColumnName(transPrefix, objFieldName),
    key: columnName,
    fieldName: objFieldName,
    minWidth: 100,
    maxWidth: 150,
    onRender: (rec) => (
      <Tooltip title={rec[objFieldName]}>
        <TextWrap>{rec[objFieldName]}</TextWrap>
      </Tooltip>
    ),
  }
}

export function timestampColumn(
  transPrefix: string,
  columnName: string // case-sensitive
): IColumn {
  const objFieldName = columnName.toLowerCase()
  return {
    name: commonColumnName(transPrefix, objFieldName),
    key: columnName,
    fieldName: objFieldName,
    minWidth: 100,
    maxWidth: 150,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => (
      <TextWrap>
        <DateTime.Calendar unixTimestampMs={rec[objFieldName] * 1000} />
      </TextWrap>
    ),
  }
}

////////////////////////////////////////////

export function getSelectedColumns(
  visibleColumnKeys: IColumnKeys,
  columnRefs: { [key: string]: string[] }
) {
  let fields: string[] = []
  Object.keys(visibleColumnKeys).forEach((k) => {
    if (visibleColumnKeys[k] === true) {
      const refFields = columnRefs[k]
      if (refFields !== undefined) {
        fields = fields.concat(refFields)
      } else {
        fields.push(k)
      }
    }
  })
  return fields
}
