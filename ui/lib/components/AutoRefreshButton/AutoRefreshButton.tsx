import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { DownOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons'
import { Spin, Dropdown, Menu, Space } from 'antd'
import { useSpring, animated } from 'react-spring'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'
import { useGetSet } from 'react-use'

interface AutoRefreshButtonProps {
  autoRefreshSecondsOptions: number[]
  // set to 0 will stop the auto refresh
  autoRefreshSeconds: number
  onAutoRefreshSecondsChange: (v: number) => void
  onRefresh: () => void
  // set to false will pause the auto refresh
  disabled?: boolean
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
  autoRefreshSecondsOptions,
  autoRefreshSeconds,
  onAutoRefreshSecondsChange,
  onRefresh,
  disabled = false,
}: AutoRefreshButtonProps) {
  const { t } = useTranslation()
  const autoRefreshMenu = useMemo(
    () => (
      <Menu
        onClick={({ key }) =>
          onAutoRefreshSecondsChange(parseInt(key as string))
        }
        selectedKeys={[String(autoRefreshSeconds || 0)]}
      >
        <Menu.ItemGroup
          title={t('component.autoRefreshButton.auto_refresh.title')}
        >
          <Menu.Item key="0">
            {t('component.autoRefreshButton.auto_refresh.off')}
          </Menu.Item>
          <Menu.Divider />
          {autoRefreshSecondsOptions.map((sec) => {
            return (
              <Menu.Item key={String(sec)}>
                {getValueFormat('s')(sec, 0)}
              </Menu.Item>
            )
          })}
        </Menu.ItemGroup>
      </Menu>
    ),
    [autoRefreshSeconds, autoRefreshSecondsOptions, onAutoRefreshSecondsChange]
  )

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [getRemainingRefreshSeconds, setRemainingRefreshSeconds] =
    useGetSet(autoRefreshSeconds)

  const resetTimer = useCallback(() => {
    clearTimeout(timer.current!)
    timer.current = undefined
    setRemainingRefreshSeconds(autoRefreshSeconds)
  }, [autoRefreshSeconds])

  useEffect(() => {
    clearTimeout(timer.current!)
    timer.current = undefined
    if (
      // If remaining seconds is less than the new autoRefreshSeconds, keep the current remaining seconds.
      // Otherwise, set remaining seconds to new autoRefreshSeconds.
      getRemainingRefreshSeconds() > autoRefreshSeconds ||
      getRemainingRefreshSeconds() === 0
    ) {
      setRemainingRefreshSeconds(autoRefreshSeconds)
    }
  }, [autoRefreshSeconds])

  const handleRefresh = useCallback(async () => {
    if (disabled) {
      return
    }
    resetTimer()
    onRefresh()
  }, [disabled, resetTimer, onRefresh])

  useEffect(() => {
    // stop or pause auto refresh need to clear timer
    if (!autoRefreshSeconds || disabled) {
      if (!!timer.current) {
        clearTimeout(timer.current)
        timer.current = undefined
      }
      return
    }

    timer.current = setTimeout(() => {
      if (getRemainingRefreshSeconds() === 0) {
        setRemainingRefreshSeconds(autoRefreshSeconds)
        handleRefresh()
      } else {
        setRemainingRefreshSeconds((c) => c - 1)
      }
    }, 1000)
    return () => clearTimeout(timer.current!)
  }, [autoRefreshSeconds, disabled, getRemainingRefreshSeconds()])

  return (
    <Dropdown.Button
      disabled={disabled}
      onClick={handleRefresh}
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
