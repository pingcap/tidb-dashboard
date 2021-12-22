import React, { useCallback, useEffect, useState } from 'react'
import { DownOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons'
import { Spin, Dropdown, Menu, Space } from 'antd'
import { useSpring, animated } from 'react-spring'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'
import { useGetSet } from 'react-use'

interface AutoRefreshButtonProps {
  // use seconds as options
  options: number[]
  autoRefreshSeconds: number
  onAutoRefreshSecondsChange: (v: number) => void
  onRefresh: () => void
  isLoading: boolean
  enabled?: boolean
}

const translations = {
  en: {
    refresh: 'Refresh',
    auto_refresh: {
      title: 'Auto Refresh',
      off: 'Off',
    },
  },
  zh: {
    refresh: '刷新',
    auto_refresh: {
      title: '自动刷新',
      off: '关闭',
    },
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      autoRefreshButton: translations[key],
    },
  })
}

export function AutoRefreshButton({
  options,
  autoRefreshSeconds,
  onAutoRefreshSecondsChange,
  onRefresh,
  enabled = true,
  isLoading,
}: AutoRefreshButtonProps) {
  const { t } = useTranslation()
  const autoRefreshMenu = (
    <Menu
      onClick={({ key }) => onAutoRefreshSecondsChange(parseInt(key as string))}
      selectedKeys={[String(autoRefreshSeconds || 0)]}
    >
      <Menu.ItemGroup
        title={t('component.autoRefreshButton.auto_refresh.title')}
      >
        <Menu.Item key="0">
          {t('component.autoRefreshButton.auto_refresh.off')}
        </Menu.Item>
        <Menu.Divider />
        {options.map((sec) => {
          return (
            <Menu.Item key={String(sec)}>
              {getValueFormat('s')(sec, 0)}
            </Menu.Item>
          )
        })}
      </Menu.ItemGroup>
    </Menu>
  )

  const handleRefresh = useCallback(() => {
    if (isLoading) {
      return
    }
    onRefresh()
  }, [isLoading, onRefresh])

  // Auto refresh
  const [timer, setTimer] = useState<number | undefined>()
  const [getRemainingRefreshSeconds, setRemainingRefreshSeconds] =
    useGetSet(autoRefreshSeconds)

  useEffect(() => {
    setRemainingRefreshSeconds(autoRefreshSeconds)
  }, [autoRefreshSeconds])

  useEffect(() => {
    if (autoRefreshSeconds === 0) {
      clearTimeout(timer)
      setTimer(undefined)
      return
    }

    clearTimeout(timer)
    setTimer(
      setTimeout(() => {
        if (isLoading) {
          return
        }

        if (getRemainingRefreshSeconds() === 0) {
          setRemainingRefreshSeconds(autoRefreshSeconds)
          handleRefresh()
        } else {
          setRemainingRefreshSeconds((c) => c - 1)
        }
      }, 1000) as unknown as number
    )
    return () => clearTimeout(timer)
  }, [autoRefreshSeconds, isLoading, getRemainingRefreshSeconds()])

  // reset auto refresh when onRefresh function update
  useEffect(() => {
    clearTimeout(timer)
    setTimer(undefined)
    setRemainingRefreshSeconds(autoRefreshSeconds)
  }, [onRefresh])

  return (
    <Space>
      <Dropdown.Button
        disabled={!enabled}
        onClick={() => handleRefresh()}
        overlay={autoRefreshMenu}
        trigger={['click']}
        icon={<DownOutlined />}
      >
        {autoRefreshSeconds ? (
          <RefreshProgress
            value={1 - (getRemainingRefreshSeconds() || 0) / autoRefreshSeconds}
          />
        ) : (
          <SyncOutlined />
        )}
        {t('component.autoRefreshButton.refresh')}
      </Dropdown.Button>

      {isLoading && (
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      )}
    </Space>
  )
}

function RefreshProgress(props) {
  const { value } = props
  const r = 50
  const totalLength = 2 * Math.PI * r
  const [springProps, setSpringProps] = useSpring(() => ({
    value: 0,
  }))

  useEffect(() => {
    setSpringProps({
      value,
    })
  }, [setSpringProps, value])

  return (
    <svg
      viewBox="0 0 120 120"
      width="1em"
      height="1em"
      className="anticon"
      style={{
        transform: 'rotate(-90deg)',
      }}
    >
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#eee"
        strokeWidth="20"
      />
      <animated.circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={springProps.value.interpolate({
          range: [0, 1],
          output: ['#989CAB', '#4571FF'],
        })}
        strokeWidth="20"
        strokeDasharray={totalLength}
        strokeDashoffset={springProps.value.interpolate({
          range: [0, 1],
          output: [totalLength, 0],
        })}
      />
    </svg>
  )
}
