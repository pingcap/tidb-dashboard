import React, { Component } from 'react'
import {
  AreaChartOutlined,
  ArrowsAltOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  DownOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Slider, Spin, Select, Dropdown, Button } from 'antd'
import { withTranslation, WithTranslation } from 'react-i18next'
import Flexbox from '@g07cha/flexbox-react'
import { Card } from '@pingcap-incubator/dashboard_components'

export interface IKeyVisToolBarProps {
  isLoading: boolean
  isAutoFetch: boolean
  isOnBrush: boolean
  metricType: string
  brightLevel: number
  dateRange: number
  onResetZoom: () => void
  onToggleBrush: () => void
  onChangeMetric: (string) => void
  onToggleAutoFetch: any
  onChangeDateRange: (number) => void
  onChangeBrightLevel: (number) => void
}

class KeyVisToolBar extends Component<IKeyVisToolBarProps & WithTranslation> {
  state = {
    exp: 0,
  }

  handleAutoFetch = () => {
    this.props.onToggleAutoFetch()
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
    const { t, isAutoFetch, dateRange, isOnBrush, metricType } = this.props

    const DateRangeOptions = [
      {
        text: t('keyvis.toolbar.date_range.hour', { n: 1 }),
        value: 3600 * 1,
      },
      {
        text: t('keyvis.toolbar.date_range.hour', { n: 6 }),
        value: 3600 * 6,
      },
      {
        text: t('keyvis.toolbar.date_range.hour', { n: 12 }),
        value: 3600 * 12,
      },
      {
        text: t('keyvis.toolbar.date_range.day', { n: 1 }),
        value: 3600 * 24,
      },
      {
        text: t('keyvis.toolbar.date_range.day', { n: 7 }),
        value: 3600 * 24 * 7,
      },
    ]

    const MetricOptions = [
      { text: t('keyvis.toolbar.view_type.read_bytes'), value: 'read_bytes' },
      {
        text: t('keyvis.toolbar.view_type.write_bytes'),
        value: 'written_bytes',
      },
      { text: t('keyvis.toolbar.view_type.read_keys'), value: 'read_keys' },
      { text: t('keyvis.toolbar.view_type.write_keys'), value: 'written_keys' },
      { text: t('keyvis.toolbar.view_type.all'), value: 'integration' },
    ]

    return (
      <Card>
        <div className="PD-KeyVis-Toolbar">
          <Dropdown
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
              {t('keyvis.toolbar.brightness')}
              <DownOutlined />
            </Button>
          </Dropdown>

          <div className="space" />

          <Button.Group>
            <Button
              onClick={this.props.onToggleBrush}
              icon={<ArrowsAltOutlined />}
              type={isOnBrush ? 'primary' : 'default'}
            >
              {t('keyvis.toolbar.zoom.select')}
            </Button>
            <Button onClick={this.props.onResetZoom}>
              {t('keyvis.toolbar.zoom.reset')}
            </Button>
          </Button.Group>

          <div className="space" />

          <Button
            onClick={this.handleAutoFetch}
            icon={<SyncOutlined />}
            type={isAutoFetch ? 'primary' : 'default'}
          >
            {t('keyvis.toolbar.auto_refresh')}
          </Button>

          <div className="space" />

          <Select
            onChange={this.handleDateRange}
            value={dateRange}
            style={{ width: 150 }}
          >
            {DateRangeOptions.map((option) => (
              <Select.Option
                key={option.text}
                value={option.value}
                className="PD-KeyVis-Select-Option"
              >
                <ClockCircleOutlined /> {option.text}
              </Select.Option>
            ))}
          </Select>

          <div className="space" />

          <Select
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

          {this.props.isLoading && (
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            />
          )}
        </div>
      </Card>
    )
  }
}

export default withTranslation()(KeyVisToolBar)
