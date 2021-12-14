import React, { useCallback, useEffect } from 'react'
import { DownOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons'
import { Spin, Dropdown, Menu } from 'antd'
import { useSpring, animated } from 'react-spring'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'

interface AutoRefreshButtonProps {
  // use seconds as options
  options: number[]
  autoRefreshSeconds: number
  onAutoRefreshSecondsChange: (v: number) => void
  onRefresh: () => void
  isLoading: boolean
  remainingRefreshSeconds: number
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
  remainingRefreshSeconds,
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

  return (
    <>
      <Dropdown.Button
        disabled={!enabled}
        onClick={() => handleRefresh()}
        overlay={autoRefreshMenu}
        trigger={['click']}
        icon={<DownOutlined />}
      >
        {autoRefreshSeconds ? (
          <RefreshProgress
            value={1 - (remainingRefreshSeconds || 0) / autoRefreshSeconds}
          />
        ) : (
          <SyncOutlined />
        )}
        {t('component.autoRefreshButton.refresh')}
      </Dropdown.Button>

      {(isLoading || remainingRefreshSeconds === 1) && (
        <Spin
          indicator={
            <LoadingOutlined
              style={{ fontSize: 24, marginLeft: '10px' }}
              spin
            />
          }
        />
      )}
    </>
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
