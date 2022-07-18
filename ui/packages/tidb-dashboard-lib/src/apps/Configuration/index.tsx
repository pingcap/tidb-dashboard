import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useEffect,
  useContext
} from 'react'
import { Routes, Route, HashRouter as Router } from 'react-router-dom'
import { IGroup, IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import { Modal, Spin, Tooltip, Input } from 'antd'
import { useMemoizedFn, useDebounce } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { LoadingOutlined } from '@ant-design/icons'

import { Root, CardTable, Card, Pre } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ConfigurationItem } from '@lib/client'
import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import InlineEditor from './InlineEditor'
import { ConfigurationContext } from './context'
import translations from './translations'

addTranslations(translations)

interface IRow extends ConfigurationItem {
  kind: string
}

interface IValueProps {
  item: IRow
  onSaved?: () => void
}

const loadingSpinner = <LoadingOutlined style={{ fontSize: 48 }} spin />

function Value({ item, onSaved }: IValueProps) {
  const ctx = useContext(ConfigurationContext)

  const handleSave = useMemoizedFn(async (newValue) => {
    try {
      const resp = await ctx!.ds.configurationEdit({
        id: item.id,
        kind: item.kind,
        new_value: newValue
      })
      if ((resp?.data?.warnings?.length ?? 0) > 0) {
        Modal.warning({
          title: 'Edit configuration is partially done',
          content: (
            <Pre>{resp.data.warnings?.map((w) => w.message).join('\n\n')}</Pre>
          )
        })
      }
    } catch (e) {
      return false
    }
    onSaved?.()
  })

  const stringValue = String(item.value)

  if (item.is_multi_value) {
    return (
      <span>
        <i>(multiple values)</i>{' '}
        <Tooltip title={stringValue}>
          <code>{stringValue}</code>
        </Tooltip>
      </span>
    )
  } else if (!item.is_editable) {
    return (
      <Tooltip title={stringValue}>
        <code>{stringValue}</code>
      </Tooltip>
    )
  } else {
    // Note: We preserve the original value so that newValue's type can be inferred.
    return (
      <InlineEditor
        value={item.value}
        displayValue={stringValue}
        title={item.id}
        onSave={handleSave}
      />
    )
  }
}

function getKey(item: IRow) {
  return `${item.kind}.${item.id}`
}

function Configuration() {
  const ctx = useContext(ConfigurationContext)
  if (ctx === null) {
    throw new Error('ConfigurationContext must not be null')
  }

  const { data, isLoading, error, sendRequest } = useClientRequest(
    ctx!.ds.configurationGetAll
  )

  const { t } = useTranslation()
  const [filterValueLower, setFilterValueLower] = useState('')
  const debouncedFilterValue = useDebounce(filterValueLower, { wait: 200 })

  const handleSaved = useCallback(() => {
    sendRequest()
  }, [sendRequest])

  const handleFilterChange = useCallback((e) => {
    setFilterValueLower(e.target.value.toLowerCase())
  }, [])

  const errors = useMemo(() => {
    if (error) {
      return [error]
    }
    if (data?.errors) {
      return data.errors
    }
    return []
  }, [data, error])

  const [rows, setRows] = useState<IRow[]>([])
  const [groups, setGroups] = useState<IGroup[]>([])
  const lastSavedGroups = useRef<IGroup[]>([])

  // When data is changed, re-calculate rows and groups.
  useEffect(() => {
    if (!data) {
      setRows([])
      setGroups([])
      lastSavedGroups.current = []
      return
    }

    const newRows: IRow[] = []
    const newGroups: IGroup[] = []
    let startIndex = 0
    for (const configKind of [
      'tidb_variable',
      'pd_config',
      'tikv_config',
      'tidb_config'
    ]) {
      const items = data?.items?.[configKind] ?? []
      for (const item of items) {
        if (debouncedFilterValue.length > 0) {
          if (
            item.id?.toLowerCase().indexOf(debouncedFilterValue) === -1 &&
            String(item.value).toLowerCase().indexOf(debouncedFilterValue) ===
              -1
          ) {
            continue
          }
        }
        newRows.push({
          ...item,
          kind: configKind
        })
      }
      newGroups.push({
        key: configKind,
        name: t(`configuration.common.kind.${configKind}`),
        startIndex: startIndex,
        count: newRows.length - startIndex
      })
      startIndex = newRows.length
    }

    setRows(newRows)

    // DetailsList internally changes the group element and add new fields. When assigning new
    // fresh groups, group states will be changed, result in UI state not preserved.
    // Thus, we update to use new groups only when groups are different.
    if (JSON.stringify(lastSavedGroups.current) === JSON.stringify(newGroups)) {
      // Update group reference, otherwise DetailsList won't update
      setGroups((g) => [...g])
    } else {
      setGroups(newGroups)
      lastSavedGroups.current = JSON.parse(JSON.stringify(newGroups))
    }
  }, [data, debouncedFilterValue, t])

  const columns = useMemo(() => {
    const columns: IColumn[] = [
      {
        key: 'key',
        name: 'Config',
        minWidth: 300,
        maxWidth: 300,
        onRender: (item) => {
          return (
            <Tooltip title={item.id}>
              <code>{item.id}</code>
            </Tooltip>
          )
        }
      },
      {
        key: 'value',
        name: 'Value',
        onRender: (item) => {
          return <Value item={item} onSaved={handleSaved} />
        },
        minWidth: 300,
        maxWidth: 300
      }
    ]
    return columns
  }, [handleSaved])

  return (
    <Root>
      <ScrollablePane style={{ height: '100vh' }}>
        <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
          <div style={{ display: 'flow-root' }}>
            <Card>
              <Input
                placeholder="Filter"
                onChange={handleFilterChange}
                data-e2e="search_config"
              />
            </Card>
          </div>
        </Sticky>
        <Spin indicator={loadingSpinner} spinning={isLoading && !!data}>
          <Card noMarginTop>
            <CardTable
              disableSelectionZone
              cardNoMargin
              loading={isLoading}
              columns={columns}
              items={rows}
              groups={groups}
              errors={errors}
              extendLastColumn
              getKey={getKey}
              groupProps={{
                showEmptyGroups: true
              }}
            />
          </Card>
        </Spin>
      </ScrollablePane>
    </Root>
  )
}

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/configuration" element={<Configuration />} />
    </Routes>
  )
}

export default function () {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export * from './context'
