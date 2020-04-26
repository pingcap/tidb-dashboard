import React, { Component, useEffect } from 'react'
import {
  AreaChartOutlined,
  ArrowsAltOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  DownOutlined,
  LoadingOutlined,
  SyncOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Slider, Spin, Select, Dropdown, Button, Menu, Tooltip } from 'antd'
import { withTranslation, WithTranslation } from 'react-i18next'
import { useSpring, animated } from 'react-spring'
import Flexbox from '@g07cha/flexbox-react'
import { Card } from '@lib/components'
import prettyMs from 'pretty-ms'

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

export interface IKeyVisToolBarProps {
  enabled: boolean
  isLoading: boolean
  autoRefreshSeconds: number
  remainingRefreshSeconds?: number
  isOnBrush: boolean
  metricType: string
  brightLevel: number
  dateRange: number
  onResetZoom: () => void
  onToggleBrush: () => void
  onChangeMetric: (string) => void
  onChangeDateRange: (number) => void
  onChangeBrightLevel: (number) => void
  onChangeAutoRefresh: (number) => void
  onRefresh: () => void
  onShowSettings: () => any
}

class KeyVisToolBar extends Component<IKeyVisToolBarProps & WithTranslation> {
  state = {
    exp: 0,
  }

  handleRefreshClick = () => {
    this.props.onRefresh()
  }

  handleAutoRefreshMenuClick = ({ key }) => {
    this.props.onChangeAutoRefresh(parseInt(key))
  }

  handleDateRange = (value) => {
    this.props.onChangeDateRange(value)
  }

  handleMetricChange = (value) => {
    this.props.onChangeMetric(value)
  }

  handleBrightLevel = (exp: number) => {
    this.props.onChangeBrightLevel(1 * Math.pow(2, exp))
    this.setState({ exp })
  }

  handleBrightnessDropdown = () => {
    setTimeout(() => {
      this.handleBrightLevel(this.state.exp)
    }, 0)
  }

  render() {
    const {
      t,
      enabled,
      dateRange,
      isOnBrush,
      metricType,
      remainingRefreshSeconds,
      autoRefreshSeconds,
      onShowSettings,
    } = this.props

    // in hours
    const dateRangeOptions = [1, 6, 12, 24, 24 * 7]

    const MetricOptions = [
      { text: t('keyviz.toolbar.view_type.read_bytes'), value: 'read_bytes' },
      {
        text: t('keyviz.toolbar.view_type.write_bytes'),
        value: 'written_bytes',
      },
      { text: t('keyviz.toolbar.view_type.read_keys'), value: 'read_keys' },
      { text: t('keyviz.toolbar.view_type.write_keys'), value: 'written_keys' },
      { text: t('keyviz.toolbar.view_type.all'), value: 'integration' },
    ]

    // in seconds
    const autoRefreshOptions = [15, 30, 1 * 60, 2 * 60, 5 * 60, 10 * 60]

    const autoRefreshMenu = (
      <Menu
        onClick={this.handleAutoRefreshMenuClick}
        selectedKeys={[String(this.props.autoRefreshSeconds || 0)]}
      >
        <Menu.ItemGroup title={t('keyviz.toolbar.auto_refresh.title')}>
          <Menu.Item key="0">{t('keyviz.toolbar.auto_refresh.off')}</Menu.Item>
          <Menu.Divider />
          {autoRefreshOptions.map((sec) => {
            return (
              <Menu.Item key={String(sec)}>
                {prettyMs(sec * 1000, { verbose: true })}
              </Menu.Item>
            )
          })}
        </Menu.ItemGroup>
      </Menu>
    )

    return (
      <Card>
        <div className="PD-KeyVis-Toolbar">
          <Dropdown
            disabled={!enabled}
            overlay={
              <div id="PD-KeyVis-Brightness-Overlay">
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <Flexbox flexDirection="column">
                    <div className="PD-Cluster-Legend" />
                    <Slider
                      defaultValue={0}
                      min={-6}
                      max={6}
                      step={0.1}
                      onChange={(value) =>
                        this.handleBrightLevel(value as number)
                      }
                    />
                  </Flexbox>
                </div>
              </div>
            }
            trigger={['click']}
            onVisibleChange={this.handleBrightnessDropdown}
          >
            <Button icon={<BulbOutlined />}>
              {t('keyviz.toolbar.brightness')}
              <DownOutlined />
            </Button>
          </Dropdown>

          <div className="space" />

          <Button.Group>
            <Button
              disabled={!enabled}
              onClick={this.props.onToggleBrush}
              icon={<ArrowsAltOutlined />}
              type={isOnBrush ? 'primary' : 'default'}
            >
              {t('keyviz.toolbar.zoom.select')}
            </Button>
            <Button disabled={!enabled} onClick={this.props.onResetZoom}>
              {t('keyviz.toolbar.zoom.reset')}
            </Button>
          </Button.Group>

          <div className="space" />

          <Select
            disabled={!enabled}
            onChange={this.handleDateRange}
            value={dateRange}
            style={{ width: 150 }}
          >
            {dateRangeOptions.map((hour) => (
              <Select.Option
                key={hour}
                value={hour * 60 * 60}
                className="PD-KeyVis-Select-Option"
              >
                <ClockCircleOutlined />{' '}
                {prettyMs(hour * 60 * 60 * 1000, { verbose: true })}
              </Select.Option>
            ))}
          </Select>

          <div className="space" />

          <Select
            disabled={!enabled}
            onChange={this.handleMetricChange}
            value={metricType}
            style={{ width: 160 }}
          >
            {MetricOptions.map((option) => (
              <Select.Option
                key={option.text}
                value={option.value}
                className="PD-KeyVis-Select-Option"
              >
                <AreaChartOutlined /> {option.text}
              </Select.Option>
            ))}
          </Select>

          <div className="space" />

          <Dropdown.Button
            disabled={!enabled}
            onClick={this.handleRefreshClick}
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
            {t('keyviz.toolbar.refresh')}
          </Dropdown.Button>

          <div className="space" />

          {this.props.isLoading && (
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            />
          )}

          <div style={{ flex: 1 }} />

          <Tooltip title={t('keyviz.settings.title')}>
            <SettingOutlined onClick={onShowSettings} />
          </Tooltip>
        </div>
      </Card>
    )
  }
}

export default withTranslation()(KeyVisToolBar)
