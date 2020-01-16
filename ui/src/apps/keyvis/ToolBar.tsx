import { Slider, Spin, Icon, Select } from 'antd'
import React, { Component } from 'react'

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

const DateRangeOptions = [
  { text: '1 Hour', value: 3600 },
  { text: '6 Hours', value: 3600 * 6 },
  { text: '12 Hours', value: 3600 * 12 },
  { text: '1 Day', value: 3600 * 24 },
  { text: '7 Days', value: 3600 * 24 * 7 }
]

const MetricOptions = [
  { text: 'Read Bytes', value: 'read_bytes' },
  { text: 'Write Bytes', value: 'written_bytes' },
  { text: 'Read Keys', value: 'read_keys' },
  { text: 'Write Keys', value: 'written_keys' },
  { text: 'All', value: 'integration' }
]

export default class KeyVisToolBar extends Component<IKeyVisToolBarProps> {
  handleAutoFetch = () => {
    this.props.onToggleAutoFetch()
  }

  handleDateRange = value => {
    this.props.onChangeDateRange(value)
  }

  handleMetricChange = value => {
    this.props.onChangeMetric(value)
  }

  handleBrightLevel = (exp: number) => {
    this.props.onChangeBrightLevel(1 * Math.pow(2, exp))
  }

  render() {
    const { isAutoFetch, dateRange, isOnBrush, metricType } = this.props

    return (
      <div className="PD-KeyVis-Toolbar">
        <div className="PD-Cluster-Legend" />
        <div style={{ width: 150, marginLeft: 48 }}>
          <Slider
            defaultValue={0}
            min={-6}
            max={6}
            step={0.1}
            onChange={value => this.handleBrightLevel(value as number)}
          />
        </div>
        <div className="space" />
        {this.props.isLoading && (
          <Spin
            indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
          />
        )}
        <div
          onClick={this.props.onResetZoom}
          className="PD-Action-Icon clickable"
        >
          <Icon type="zoom-out" style={{ fontSize: 24 }} />
          <span>Reset Zoom</span>
        </div>
        <div
          onClick={this.props.onToggleBrush}
          className="PD-Action-Icon clickable"
          style={{ color: isOnBrush ? 'green' : 'black' }}
        >
          <Icon type="zoom-in" style={{ fontSize: 24 }} />
          <span>Zoom In</span>
        </div>
        <div
          onClick={this.handleAutoFetch}
          className="PD-Action-Icon clickable"
          style={{ color: isAutoFetch ? 'green' : 'black' }}
        >
          <Icon type="sync" style={{ fontSize: 24 }} />
          <span>Auto Update</span>
        </div>
        <div className="PD-Action-Icon">
          <Icon type="clock-circle" style={{ fontSize: 24 }} />
          <Select onChange={this.handleDateRange} value={dateRange}>
            {DateRangeOptions.map(option => (
              <Select.Option key={option.text} value={option.value}>
                {option.text}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className="PD-Action-Icon">
          <Icon type="area-chart" style={{ fontSize: 24 }} />
          <Select onChange={this.handleMetricChange} value={metricType}>
            {MetricOptions.map(option => (
              <Select.Option key={option.text} value={option.value}>
                {option.text}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
    )
  }
}
