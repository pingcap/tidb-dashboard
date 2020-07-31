import { Tooltip, Button } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'

import { TextWithInfo, TextWrap } from '@lib/components'

type ToggleExpandFn = (rowIdx: number, expand: boolean) => void

function commonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`diagnose.fields.${fieldName}`} />
}

function commonColumn(fieldName: string, minWidth: number, maxWidth?: number) {
  return {
    name: commonColumnName(fieldName),
    key: fieldName,
    fieldName,
    minWidth,
    maxWidth,
    onRender: (rec) => (
      <Tooltip title={rec[fieldName]}>
        <TextWrap>{rec[fieldName]}</TextWrap>
      </Tooltip>
    ),
  }
}

function ruleColumn(toggleExpand: ToggleExpandFn): IColumn {
  return {
    ...commonColumn('rule', 100, 150),
    onRender: (rec) => (
      <Tooltip title={rec.rule}>
        <TextWrap>
          {rec.is_sub && '|-- '}
          {rec.rule}{' '}
          {!rec.is_sub && (
            <Button
              type="link"
              onClick={() => toggleExpand(rec.row_idx, !rec.expand)}
            >
              {rec.expand ? 'Collapse' : 'Expand'}
            </Button>
          )}
        </TextWrap>
      </Tooltip>
    ),
  }
}

function itemColumn(): IColumn {
  return commonColumn('item', 100, 150)
}

function typeColumn(): IColumn {
  return commonColumn('type', 60, 80)
}

function instanceColumn(): IColumn {
  return commonColumn('instance', 100, 200)
}

function statusAddressColumn(): IColumn {
  return commonColumn('status_address', 100, 200)
}

function valueColumn(): IColumn {
  return commonColumn('value', 100, 150)
}

function referenceColumn(): IColumn {
  return commonColumn('reference', 100, 150)
}

function severityColumn(): IColumn {
  return commonColumn('severity', 100, 120)
}

function detailsColumn(): IColumn {
  return commonColumn('details', 200)
}

function categoryColumn(): IColumn {
  return commonColumn('category', 100, 200)
}

function tableColumn(): IColumn {
  return commonColumn('table', 100, 200)
}

function errorColumn(): IColumn {
  return commonColumn('error', 200)
}

//////////////////////////////////////////

export function diagnosisColumns(
  rows: any[],
  toggleExpand: ToggleExpandFn
): IColumn[] {
  if (rows.length > 0 && rows[0].error) {
    return [categoryColumn(), tableColumn(), errorColumn()]
  }
  return [
    ruleColumn(toggleExpand),
    itemColumn(),
    typeColumn(),
    instanceColumn(),
    statusAddressColumn(),
    valueColumn(),
    referenceColumn(),
    severityColumn(),
    detailsColumn(),
  ]
}
