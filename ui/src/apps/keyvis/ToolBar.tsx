import { Slider, Spin, Icon, Select, Dropdown, Button, Input } from 'antd'
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
  { text: '1 小时', value: 3600 },
  { text: '6 小时', value: 3600 * 6 },
  { text: '12 小时', value: 3600 * 12 },
  { text: '1 天', value: 3600 * 24 },
  { text: '7 天', value: 3600 * 24 * 7 }
]

const MetricOptions = [
  { text: '读取字节量', value: 'read_bytes' },
  { text: '写入字节量', value: 'written_bytes' },
  { text: '读取 keys', value: 'read_keys' },
  { text: '写入 keys', value: 'written_keys' },
  { text: '所有', value: 'integration' }
]

export default class KeyVisToolBar extends Component<IKeyVisToolBarProps> {
  state = {
    brightnessDropdownVisible: false,
    exp: 0
  }

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
    this.setState({ exp })
  }

  handleBrightnessDropdown = (visible: boolean) => {
    this.setState({ brightnessDropdownVisible: visible })
    this.props.onChangeBrightLevel(1 * Math.pow(2, this.state.exp))
  }

  render() {
    const { isAutoFetch, dateRange, isOnBrush, metricType } = this.props

    return (
      <div className="PD-KeyVis-Toolbar">
        <Dropdown
          overlay={
            <div id="PD-KeyVis-Brightness-Overlay">
              <div className="PD-Cluster-Legend" />
              <Slider
                style={{ width: 360 }}
                defaultValue={0}
                min={-6}
                max={6}
                step={0.1}
                onChange={value => this.handleBrightLevel(value as number)}
              />
            </div>
          }
          trigger={['click']}
          onVisibleChange={this.handleBrightnessDropdown}
          visible={this.state.brightnessDropdownVisible}
        >
          <Button icon="bulb">
            调整亮度
            <Icon type="down" />
          </Button>
        </Dropdown>

        <div className="space" />

        <Button.Group>
          <Button
            onClick={this.props.onToggleBrush}
            icon="arrows-alt"
            type={isOnBrush ? 'primary' : 'default'}
          >
            框选
          </Button>
          <Button onClick={this.props.onResetZoom}>重置</Button>
        </Button.Group>

        <div className="space" />

        <Button
          onClick={this.handleAutoFetch}
          icon="sync"
          type={isAutoFetch ? 'primary' : 'default'}
        >
          自动刷新
        </Button>

        <div className="space" />

        <Select onChange={this.handleDateRange} value={dateRange}>
          {DateRangeOptions.map(option => (
            <Select.Option
              key={option.text}
              value={option.value}
              className="PD-KeyVis-Select-Option"
            >
              <Icon type="clock-circle" /> {option.text}
            </Select.Option>
          ))}
        </Select>

        <div className="space" />

        <Select onChange={this.handleMetricChange} value={metricType}>
          {MetricOptions.map(option => (
            <Select.Option
              key={option.text}
              value={option.value}
              className="PD-KeyVis-Select-Option"
            >
              <Icon type="area-chart" /> {option.text}
            </Select.Option>
          ))}
        </Select>

        <div className="space" />

        {this.props.isLoading && (
          <Spin
            indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
          />
        )}
      </div>
    )
  }
}
