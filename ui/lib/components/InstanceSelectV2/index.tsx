import React, { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallowCompareEffect } from 'react-use'
import { Tooltip } from 'antd'
import { IBaseSelectProps, BaseSelect, TextWrap } from '../'
import { addTranslationResource } from '@lib/utils/i18n'
import { useControllableValue } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import SelectionWithFilter from '@lib/utils/selectionWithFilter'
import DropOverlay from './DropOverlay'
import ValueDisplay from './ValueDisplay'
import { ITableWithFilterRefProps } from './TableWithFilter'
import { TopoCompInfoWithSignature } from '@lib/client'
import InstanceStatusBadgeV2 from '../InstanceStatusBadgeV2'
import { InstanceStatusV2 } from '@lib/utils/instanceTable'

export interface IInstanceSelectProps
  extends Omit<IBaseSelectProps<string[]>, 'dropdownRender' | 'valueRender'> {
  onChange?: (value: string[]) => void // The value is always the signature of the instance item
  instances?: TopoCompInfoWithSignature[]
  dropContainerProps?: React.HTMLAttributes<HTMLDivElement>
}

const translations = {
  en: {
    placeholder: 'Select Instances',
    filterPlaceholder: 'Filter instance',
    selected: {
      all: 'All Instances',
      partial: {
        n: '{{n}} {{component}}',
        all: 'All {{component}}',
      },
    },
    columns: {
      key: 'Instance',
      status: 'Status',
    },
  },
  zh: {
    placeholder: '选择实例',
    filterPlaceholder: '过滤实例',
    selected: {
      all: '所有实例',
      partial: {
        n: '{{n}} {{component}}',
        all: '所有 {{component}}',
      },
    },
    columns: {
      key: '实例',
      status: '状态',
    },
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      instanceSelectV2: translations[key],
    },
  })
}

const getKey = (v: TopoCompInfoWithSignature) => v.signature!

export default function InstanceSelectV2(props: IInstanceSelectProps) {
  const [internalVal, setInternalVal] = useControllableValue<string[]>(props)

  const {
    instances, // only to exclude from restProps
    dropContainerProps, // only to exclude from restProps
    value, // only to exclude from restProps
    onChange, // only to exclude from restProps
    ...restProps
  } = props

  const { t } = useTranslation()

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: t('component.instanceSelectV2.columns.key'),
        key: 'key',
        minWidth: 150,
        maxWidth: 150,
        onRender: (node: TopoCompInfoWithSignature) => {
          const val = `${node.ip}:${node.port}`
          return (
            <TextWrap>
              <Tooltip title={val}>
                <span>{val}</span>
              </Tooltip>
            </TextWrap>
          )
        },
      },
      {
        name: t('component.instanceSelectV2.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 100,
        onRender: (node: TopoCompInfoWithSignature) => {
          return (
            <TextWrap>
              <InstanceStatusBadgeV2 status={node.status as InstanceStatusV2} />
            </TextWrap>
          )
        },
      },
    ],
    [t]
  )

  const selection = useRef(
    new SelectionWithFilter({
      onSelectionChanged: () => {
        const s =
          selection.current.getAllSelection() as TopoCompInfoWithSignature[]
        const keys = s.map((v) => v.signature!)
        setInternalVal([...keys])
      },
      getKey,
    })
  )

  useShallowCompareEffect(() => {
    selection.current?.resetAllSelection(internalVal ?? [])
  }, [internalVal])

  useEffect(() => {
    const sel = selection.current
    sel.setChangeEvents(false)
    sel.setAllItems(instances ?? [])
    if (internalVal && internalVal.length > 0) {
      sel.resetAllSelection(internalVal)
    }
    sel.setChangeEvents(true)
  }, [instances])

  const renderValue = useCallback(
    (selectedKeys) => {
      if (
        !instances ||
        instances.length === 0 ||
        !selectedKeys ||
        selectedKeys.length === 0
      ) {
        return null
      }
      return <ValueDisplay items={instances} selectedKeys={selectedKeys} />
    },
    [instances]
  )

  const filterTableRef = useRef<ITableWithFilterRefProps>(null)

  const renderDropdown = useCallback(
    () => (
      <DropOverlay
        columns={columns}
        items={instances ?? []}
        selection={selection.current as any}
        getKey={getKey}
        filterTableRef={filterTableRef}
        containerProps={dropContainerProps}
      />
    ),
    [columns, instances, dropContainerProps]
  )

  const handleOpened = useCallback(() => {
    filterTableRef.current?.focusFilterInput()
  }, [])

  return (
    <BaseSelect
      dropdownRender={renderDropdown}
      value={internalVal}
      valueRender={renderValue}
      placeholder={t('component.instanceSelectV2.placeholder')}
      onOpened={handleOpened}
      {...restProps}
    />
  )
}
