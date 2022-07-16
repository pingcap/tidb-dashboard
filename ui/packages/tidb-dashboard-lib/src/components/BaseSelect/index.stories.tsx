import React from 'react'
import { Button } from 'antd'

import BaseSelect from '.'

export default {
  title: 'Select/Base Select'
}

export const shortContent = () => (
  <BaseSelect
    dropdownRender={() => <div>Content</div>}
    valueRender={() => <span>Short</span>}
  />
)

export const longContent = () => (
  <BaseSelect
    style={{ width: 120 }}
    dropdownRender={() => <div>Content</div>}
    valueRender={() => <span>Very Lonnnnnnnnng Value</span>}
  />
)

export const disabled = () => (
  <BaseSelect
    disabled
    dropdownRender={() => <div>Content</div>}
    valueRender={() => <span>Disabled</span>}
  />
)

export const antdButton = () => <Button>Antd Button</Button>
