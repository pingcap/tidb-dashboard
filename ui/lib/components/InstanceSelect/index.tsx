import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react'
import { Tooltip, Typography } from 'antd'
import { Selection } from 'office-ui-fabric-react/lib/Selection'
import { BaseSelect, InstanceStatusBadge, TextWrap } from '../'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { usePersistFn } from '@umijs/hooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  buildInstanceTable,
  IInstanceTableItem,
} from '@lib/utils/instanceTable'

import DropOverlay from './DropOverlay'
import SelectDisplay from './SelectDisplay'

export interface IInstanceSelectProps {
  enableTiFlash?: boolean
  defaultSelectAll?: boolean
  onChange?: (values: string[]) => void
  value?: string[]
}

export interface IInstanceSelectRefProps {
  mapValueToNode: (value: string) => void
}

function InstanceSelect(
  props: IInstanceSelectProps,
  ref: React.Ref<IInstanceSelectRefProps>
) {
  const {
    data: dataTiDB,
    isLoading: loadingTiDB,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getTiDBTopology({ cancelToken })
  )
  const {
    data: dataStores,
    isLoading: loadingStores,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getStoreTopology({ cancelToken })
  )
  const {
    data: dataPD,
    isLoading: loadingPD,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getPDTopology({ cancelToken })
  )

  const columns = useMemo(() => {
    const c: IColumn[] = [
      {
        name: 'Instance',
        key: 'key',
        minWidth: 160,
        maxWidth: 160,
        onRender: (node: IInstanceTableItem) => {
          return (
            <TextWrap>
              <Tooltip title={node.key}>
                <span>{node.key}</span>
              </Tooltip>
            </TextWrap>
          )
        },
      },
      {
        name: 'Status',
        key: 'status',
        minWidth: 100,
        maxWidth: 100,
        onRender: (node: IInstanceTableItem) => {
          return (
            <TextWrap>
              <InstanceStatusBadge status={node.status} />
            </TextWrap>
          )
        },
      },
    ]
    return c
  }, [])

  const [tableItems, tableGroups] = useMemo(() => {
    if (loadingTiDB || loadingStores || loadingPD) {
      return [[], []]
    }
    return buildInstanceTable({
      dataPD,
      dataTiDB,
      dataTiKV: dataStores?.tikv,
      dataTiFlash: dataStores?.tiflash,
      includeTiFlash: props.enableTiFlash,
    })
  }, [
    props.enableTiFlash,
    props.defaultSelectAll,
    dataTiDB,
    dataStores,
    dataPD,
    loadingTiDB,
    loadingStores,
    loadingPD,
  ])

  const [selectedKeys, setSelectedKeys] = useState(props.value ?? [])

  const selection = useRef(
    new Selection({
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as IInstanceTableItem[]
        setSelectedKeys(s.map((v) => v.key))
      },
    })
  )

  const dataHasLoaded = useRef(false)

  useEffect(() => {
    // Select all if `defaultSelectAll` is set.
    if (dataHasLoaded.current) {
      return
    }
    if (tableItems.length === 0) {
      return
    }
    if (props.defaultSelectAll) {
      selection.current.setItems(tableItems)
      selection.current.setAllSelected(true)
    }
    dataHasLoaded.current = true
  }, [tableItems])

  const mapValueToNode = usePersistFn(() => {})

  React.useImperativeHandle(ref, () => ({
    mapValueToNode,
  }))

  const renderValue = useCallback(() => {
    return <SelectDisplay items={tableItems} selectedKeys={selectedKeys} />
  }, [tableItems, selectedKeys])

  const renderDropdown = useCallback(() => {
    return (
      <DropOverlay
        columns={columns}
        items={tableItems}
        groups={tableGroups}
        selection={selection.current}
      />
    )
  }, [columns, tableItems, tableGroups])

  return (
    <BaseSelect
      dropdownRender={renderDropdown}
      valueRender={renderValue}
      disabled={loadingTiDB || loadingStores || loadingPD}
    />
  )
}

export default React.forwardRef(InstanceSelect)
