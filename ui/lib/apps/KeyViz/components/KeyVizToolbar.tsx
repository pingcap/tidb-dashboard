import React, { Component } from 'react'
import {
  AreaChartOutlined,
  ArrowsAltOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  DownOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Slider, Spin, Select, Dropdown, Button, Tooltip, Space } from 'antd'
import { withTranslation, WithTranslation } from 'react-i18next'
import Flexbox from '@g07cha/flexbox-react'
import { AutoRefreshButton, Card, Toolbar } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { isDistro } from '@lib/utils/distroStringsRes'

export interface IKeyVizToolbarProps {
  enabled: boolean
  isLoading: boolean
  autoRefreshSeconds: number
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

class KeyVizToolbar extends Component<IKeyVizToolbarProps & WithTranslation> {
  state = {
    exp: 0,
  }

  handleRefreshClick = () => {
    this.props.onRefresh()
  }

  handleAutoRefreshMenuClick = (key) => {
    this.props.onChangeAutoRefresh(key)
  }

  handleDateRange = (value) => {
    this.props.onChangeDateRange(value)
  }

  handleMetricChange = (value) => {
    this.props.onChangeMetric(value)
  }

  handleBrightLevel = (exp: number) => {
    this.props.onChangeBrightLevel(Math.pow(2, exp))
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
      isLoading,
      dateRange,
      isOnBrush,
      metricType,
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
      {
        text: t('keyviz.toolbar.view_type.read_query_num'),
        value: 'read_query_num',
      },
      {
        text: t('keyviz.toolbar.view_type.write_query_num'),
        value: 'write_query_num',
      },
      { text: t('keyviz.toolbar.view_type.all'), value: 'integration' },
    ]

    return (
      <Card>
        <Toolbar className="PD-KeyVis-Toolbar">
          <Space>
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
                  <ClockCircleOutlined /> {getValueFormat('h')(hour, 0)}
                </Select.Option>
              ))}
            </Select>

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

            <AutoRefreshButton
              value={autoRefreshSeconds}
              onChange={this.handleAutoRefreshMenuClick}
              onRefresh={this.handleRefreshClick}
              disabled={!enabled || isLoading}
            />

            {this.props.isLoading && (
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
              />
            )}
          </Space>

          <Space>
            <Tooltip
              mouseEnterDelay={0}
              mouseLeaveDelay={0}
              title={t('keyviz.settings.title')}
            >
              <SettingOutlined onClick={onShowSettings} />
            </Tooltip>
            {!isDistro && (
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('keyviz.settings.help')}
                placement="bottom"
              >
                <QuestionCircleOutlined
                  onClick={() => {
                    window.open(t('keyviz.settings.help_url'), '_blank')
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </Toolbar>
      </Card>
    )
  }
}

export default withTranslation()(KeyVizToolbar)
