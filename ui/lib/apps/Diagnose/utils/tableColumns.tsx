import { Tooltip } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'

import { TextWithInfo, TextWrap } from '@lib/components'

function commonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`diagnose.fields.${fieldName}`} />
}

function ruleColumn(_rows?: { rule?: string }[]): IColumn {
  return {
    name: commonColumnName('rule'),
    key: 'rule',
    fieldName: 'rule',
    minWidth: 100,
    maxWidth: 150,
  }
}

function itemColumn(_rows?: { item?: string }[]): IColumn {
  return {
    name: commonColumnName('item'),
    key: '_item',
    fieldName: 'item',
    minWidth: 100,
    maxWidth: 120,
    onRender: (rec) => (
      <Tooltip title={rec.item}>
        <TextWrap>{rec.item}</TextWrap>
      </Tooltip>
    ),
  }
}

function typeColumn(_rows?: { type?: string }[]): IColumn {
  return {
    name: commonColumnName('type'),
    key: '_type',
    fieldName: 'type',
    minWidth: 80,
    maxWidth: 100,
  }
}

function instanceColumn(_rows?: { instance?: number }[]): IColumn {
  return {
    name: commonColumnName('instance'),
    key: 'instance',
    fieldName: 'instance',
    minWidth: 100,
    maxWidth: 200,
    onRender: (rec) => (
      <Tooltip title={rec.instance}>
        <TextWrap>{rec.instance}</TextWrap>
      </Tooltip>
    ),
  }
}

function statusAddressColumn(_rows?: { status_address?: number }[]): IColumn {
  return {
    name: commonColumnName('status_address'),
    key: 'status_address',
    fieldName: 'status_address',
    minWidth: 100,
    maxWidth: 200,
    onRender: (rec) => (
      <Tooltip title={rec.status_address}>
        <TextWrap>{rec.status_address}</TextWrap>
      </Tooltip>
    ),
  }
}

function valueColumn(_rows?: { value?: string }[]): IColumn {
  return {
    name: commonColumnName('value'),
    key: '_value',
    fieldName: 'value',
    minWidth: 100,
    maxWidth: 150,
    onRender: (rec) => (
      <Tooltip title={rec.value}>
        <TextWrap>{rec.value}</TextWrap>
      </Tooltip>
    ),
  }
}

function referenceColumn(_rows?: { reference?: string }[]): IColumn {
  return {
    name: commonColumnName('reference'),
    key: 'reference',
    fieldName: 'reference',
    minWidth: 100,
    maxWidth: 150,
  }
}

function severityColumn(_rows?: { severity?: string }[]): IColumn {
  return {
    name: commonColumnName('severity'),
    key: 'severity',
    fieldName: 'severity',
    minWidth: 100,
    maxWidth: 150,
  }
}

function detailsColumn(_rows?: { details?: string }[]): IColumn {
  return {
    name: commonColumnName('details'),
    key: 'details',
    fieldName: 'details',
    minWidth: 200,
    onRender: (rec) => (
      <Tooltip title={rec.details}>
        <TextWrap>{rec.details}</TextWrap>
      </Tooltip>
    ),
  }
}

//////////////////////////////////////////

export function diagnosisColumns(rows: any[]): IColumn[] {
  return [
    ruleColumn(rows),
    itemColumn(rows),
    typeColumn(rows),
    instanceColumn(rows),
    statusAddressColumn(rows),
    valueColumn(rows),
    referenceColumn(rows),
    severityColumn(rows),
    detailsColumn(rows),
  ]
}
