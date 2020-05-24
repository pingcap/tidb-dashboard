import React, { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallowCompareEffect } from 'react-use'
import { Tooltip } from 'antd'
import { Selection } from 'office-ui-fabric-react/lib/Selection'
import {
  IBaseSelectProps,
  BaseSelect,
  InstanceStatusBadge,
  TextWrap,
} from '../'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { addTranslationResource } from '@lib/utils/i18n'
import { usePersistFn } from '@umijs/hooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  buildInstanceTable,
  IInstanceTableItem,
} from '@lib/utils/instanceTable'

import DropOverlay from './DropOverlay'
import ValueDisplay from './ValueDisplay'

export interface IInstanceSelectProps
  extends Omit<IBaseSelectProps<string[]>, 'dropdownRender' | 'valueRender'> {
  onChange?: (value: string[]) => void
  enableTiFlash?: boolean
  defaultSelectAll?: boolean
}

export interface IInstanceSelectRefProps {
  getInstanceByKeys: (keys: string[]) => IInstanceTableItem[]
  getInstanceByKey: (key: string) => IInstanceTableItem
}

const translations = {
  en: {
    placeholder: 'Select Instances',
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
  'zh-CN': {
    placeholder: '选择实例',
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
      instanceSelect: translations[key],
    },
  })
}

function InstanceSelect(
  {
    enableTiFlash,
    defaultSelectAll,
    onChange,
    value,
    ...restProps
  }: IInstanceSelectProps,
  ref: React.Ref<IInstanceSelectRefProps>
) {
  const { t } = useTranslation()

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

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: t('component.instanceSelect.columns.key'),
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
        name: t('component.instanceSelect.columns.status'),
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
    ],
    [t]
  )

  const [tableItems, tableGroups] = useMemo(() => {
    if (loadingTiDB || loadingStores || loadingPD) {
      return [[], []]
    }
    return buildInstanceTable({
      dataPD,
      dataTiDB,
      dataTiKV: dataStores?.tikv,
      dataTiFlash: dataStores?.tiflash,
      includeTiFlash: enableTiFlash,
    })
  }, [
    enableTiFlash,
    dataTiDB,
    dataStores,
    dataPD,
    loadingTiDB,
    loadingStores,
    loadingPD,
  ])

  const onChangePersist = usePersistFn((v: string[]) => {
    onChange?.(v)
  })

  const selection = useRef(
    new Selection({
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as IInstanceTableItem[]
        const keys = s.map((v) => v.key)
        onChangePersist([...keys])
      },
    })
  )

  useShallowCompareEffect(() => {
    const sel = selection.current
    if (value != null) {
      const s = sel.getSelection() as IInstanceTableItem[]
      if (
        s.length === value.length &&
        s.every((item, index) => value?.[index] === item.key)
      ) {
        return
      }
    }
    // Update selection when value is changed
    sel.setChangeEvents(false)
    sel.setAllSelected(false)
    if (value && value.length > 0) {
      for (const key of value) {
        sel.setKeySelected(key, true, false)
      }
    }
    sel.setChangeEvents(true)
  }, [value])

  const dataHasLoaded = useRef(false)

  useEffect(() => {
    // When data is loaded for the first time, we need to:
    // - Select all if `defaultSelectAll` is set and value is not given.
    // - Update selection according to value
    if (dataHasLoaded.current) {
      return
    }
    if (tableItems.length === 0) {
      return
    }
    const sel = selection.current
    sel.setChangeEvents(false)
    sel.setItems(tableItems)
    if (value && value.length > 0) {
      sel.setAllSelected(false)
      for (const key of value) {
        sel.setKeySelected(key, true, false)
      }
    } else if (defaultSelectAll) {
      sel.setAllSelected(true)
    }
    sel.setChangeEvents(true)
    dataHasLoaded.current = true
    // [defaultSelectAll, value] is not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableItems])

  const getInstanceByKeys = usePersistFn((keys: string[]) => {
    const keyToItemMap = {}
    for (const item of tableItems) {
      keyToItemMap[item.key] = item
    }
    return keys.map((key) => keyToItemMap[key])
  })

  const getInstanceByKey = usePersistFn((key: string) => {
    return getInstanceByKeys([key])[0]
  })

  React.useImperativeHandle(ref, () => ({
    getInstanceByKey,
    getInstanceByKeys,
  }))

  const renderValue = useCallback(
    (selectedKeys) => {
      if (
        tableItems.length === 0 ||
        !selectedKeys ||
        selectedKeys.length === 0
      ) {
        return null
      }
      return <ValueDisplay items={tableItems} selectedKeys={selectedKeys} />
    },
    [tableItems]
  )

  const renderDropdown = useCallback(
    () => (
      <DropOverlay
        columns={columns}
        items={tableItems}
        groups={tableGroups}
        selection={selection.current}
      />
    ),
    [columns, tableItems, tableGroups]
  )

  return (
    <BaseSelect
      {...restProps}
      dropdownRender={renderDropdown}
      value={value}
      valueRender={renderValue}
      disabled={loadingTiDB || loadingStores || loadingPD}
      placeholder={t('component.instanceSelect.placeholder')}
    />
  )
}

export default React.forwardRef(InstanceSelect)
