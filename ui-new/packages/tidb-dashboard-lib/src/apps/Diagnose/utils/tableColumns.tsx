import { Tooltip } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { PlusOutlined, MinusOutlined } from '@ant-design/icons'

import { TextWithInfo, TextWrap } from '@lib/components'

type ToggleShowSubFn = (rowIdx: number, showSub: boolean) => void

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
    onRender: (rec) => {
      if (rec.expanded) {
        return <TextWrap multiline={true}>{rec[fieldName]}</TextWrap>
      } else {
        return (
          <Tooltip title={rec[fieldName]}>
            <TextWrap>{rec[fieldName]}</TextWrap>
          </Tooltip>
        )
      }
    }
  }
}

function ruleColumn(toggleShowSub: ToggleShowSubFn): IColumn {
  const handleClick = (ev: React.MouseEvent<HTMLSpanElement>, rec) => {
    ev.stopPropagation()
    toggleShowSub(rec.row_idx, !rec.show_sub)
  }
  return {
    ...commonColumn('rule', 150, 200),
    onRender: (rec) => (
      <TextWrap multiline={rec.expanded}>
        {rec.is_sub && '|--'}
        {!rec.is_sub &&
          rec.sub_rows.length > 0 &&
          (rec.show_sub ? (
            <MinusOutlined onClick={(ev) => handleClick(ev, rec)} />
          ) : (
            <PlusOutlined onClick={(ev) => handleClick(ev, rec)} />
          ))}{' '}
        {rec.expanded ? (
          rec.rule
        ) : (
          <Tooltip title={rec.rule}>{rec.rule}</Tooltip>
        )}
      </TextWrap>
    )
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
  toggleShowSub: ToggleShowSubFn
): IColumn[] {
  if (rows.length > 0 && rows[0].error) {
    return [categoryColumn(), tableColumn(), errorColumn()]
  }
  return [
    ruleColumn(toggleShowSub),
    itemColumn(),
    typeColumn(),
    instanceColumn(),
    statusAddressColumn(),
    valueColumn(),
    referenceColumn(),
    severityColumn(),
    detailsColumn()
  ]
}
