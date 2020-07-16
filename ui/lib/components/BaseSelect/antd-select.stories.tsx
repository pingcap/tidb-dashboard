import React from 'react'
import { Select } from 'antd'

export default {
  title: 'Antd Select',
}

export const normal = () => (
  <Select defaultValue="lucy" style={{ width: 120 }}>
    <Select.Option value="jack">Jack</Select.Option>
    <Select.Option value="lucy">Lucy</Select.Option>
    <Select.Option value="disabled" disabled>
      Disabled
    </Select.Option>
    <Select.Option value="Yiminghe">yiminghe</Select.Option>
  </Select>
)

export const disabled = () => (
  <Select defaultValue="disable" style={{ width: 120 }} disabled>
    <Select.Option value="disable">Disabled</Select.Option>
  </Select>
)
