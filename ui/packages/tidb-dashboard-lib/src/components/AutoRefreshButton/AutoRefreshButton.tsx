import React, { useEffect, useRef, useState } from 'react'
import { DownOutlined, SyncOutlined } from '@ant-design/icons'
import { Dropdown, Menu } from 'antd'
import { useSpring, animated } from 'react-spring'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'
import styles from './index.module.less'
import { useChange } from '@lib/utils/useChange'
import { useControllableValue, useMemoizedFn } from 'ahooks'

export const DEFAULT_AUTO_REFRESH_OPTIONS = [
  30,
  60,
  5 * 60,
  15 * 60,
  30 * 60,
  1 * 60 * 60,
  2 * 60 * 60
]

export interface IAutoRefreshButtonProps {
  options?: number[]
  // set to 0 will stop the auto refresh
  defaultValue?: number
  value?: number
  onChange?: (number) => void
  onRefresh?: () => void
  // set to false will pause the auto refresh
  disabled?: boolean
}

const translations = {
  en: {
    refresh: 'Refresh',
    auto_refresh: {
      title: 'Auto Refresh',
      off: 'Off'
    }
  },
  zh: {
    refresh: '刷新',
    auto_refresh: {
      title: '自动刷新',
      off: '关闭'
    }
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      autoRefreshButton: translations[key]
    }
  })
}

export function AutoRefreshButton({
  options = DEFAULT_AUTO_REFRESH_OPTIONS,
  onRefresh,
  disabled = false,
  ...props
}: IAutoRefreshButtonProps) {
  const { t } = useTranslation()
  const [interval, setInterval] = useControllableValue<number>(props, {
    defaultValue: 60
  })
  const [remaining, setRemaining] = useState<number>(0)

  const autoRefreshMenu = (
    <Menu
      onClick={({ key }) => setInterval(parseInt(key as string))}
      selectedKeys={[String(interval || 0)]}
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
            <Menu.Item key={String(sec)} data-e2e={`auto_refresh_time_${sec}`}>
              {getValueFormat('s')(sec, 0)}
            </Menu.Item>
          )
        })}
      </Menu.ItemGroup>
    </Menu>
  )

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const resetTimer = useMemoizedFn(() => {
    clearTimeout(timer.current!)
    timer.current = undefined
    setRemaining(interval)
  })

  useChange(() => {
    clearTimeout(timer.current!)
    timer.current = undefined
    if (
      // If remaining seconds is less than the new interval, keep the current remaining seconds.
      // Otherwise, set remaining seconds to new interval.
      remaining > interval ||
      remaining === 0
    ) {
      setRemaining(interval)
    }
  }, [interval])

  const handleRefresh = useMemoizedFn(async () => {
    if (disabled) {
      return
    }
    resetTimer()
    onRefresh?.()
  })

  useEffect(() => {
    // stop or pause auto refresh need to clear timer
    if (!interval || disabled) {
      if (!!timer.current) {
        clearTimeout(timer.current)
        timer.current = undefined
      }
      return
    }

    timer.current = setTimeout(() => {
      if (remaining === 0) {
        setRemaining(interval)
        handleRefresh()
      } else {
        setRemaining((r) => r - 1)
      }
    }, 1000)
    return () => clearTimeout(timer.current!)
  }, [interval, disabled, remaining, /* unchange */ handleRefresh])

  return (
    <Dropdown.Button
      data-e2e="auto-refresh-button"
      className={styles.auto_refresh_btn}
      disabled={disabled}
      onClick={handleRefresh}
      overlay={autoRefreshMenu}
      trigger={['click']}
      icon={
        <>
          {Boolean(interval) && (
            <span className={styles.auto_refresh_secs}>
              {getValueFormat('s')(interval, 0)}
            </span>
          )}
          <DownOutlined />
        </>
      }
    >
      {Boolean(interval) ? (
        <RefreshProgress value={1 - remaining / interval} />
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
    value: 0
  }))

  useEffect(() => {
    setSpringProps({
      value
    })
  }, [setSpringProps, value])

  return (
    <svg
      viewBox="0 0 120 120"
      width="1em"
      height="1em"
      className="anticon"
      style={{
        transform: 'rotate(-90deg)'
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
          output: ['#989CAB', '#4571FF']
        })}
        strokeWidth="20"
        strokeDasharray={totalLength}
        strokeDashoffset={springProps.value.interpolate({
          range: [0, 1],
          output: [totalLength, 0]
        })}
      />
    </svg>
  )
}
