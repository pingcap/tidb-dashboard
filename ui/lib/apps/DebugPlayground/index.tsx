import React, { useState } from 'react'
import { Root, BaseSelect, InstanceSelect } from '@lib/components'
import { Select, Button } from 'antd'

const App = () => {
  const [instanceSelectValue, setInstanceSelectValue] = useState<string[]>([])
  return (
    <Root>
      <h1>Debug Playground</h1>
      <h2>Base Select</h2>
      <BaseSelect
        dropdownRender={() => <div>Content</div>}
        valueRender={() => <span>Short</span>}
      />
      <BaseSelect
        style={{ width: 120 }}
        dropdownRender={() => <div>Content</div>}
        valueRender={() => <span>Very Lonnnnnnnnng Value</span>}
      />
      <BaseSelect
        disabled
        dropdownRender={() => <div>Content</div>}
        valueRender={() => <span>Disabled</span>}
      />
      <Button>Antd Button</Button>
      <h2>Antd Select</h2>
      <Select defaultValue="lucy" style={{ width: 120 }}>
        <Select.Option value="jack">Jack</Select.Option>
        <Select.Option value="lucy">Lucy</Select.Option>
        <Select.Option value="disabled" disabled>
          Disabled
        </Select.Option>
        <Select.Option value="Yiminghe">yiminghe</Select.Option>
      </Select>
      <Select defaultValue="disable" style={{ width: 120 }} disabled>
        <Select.Option value="disable">Disabled</Select.Option>
      </Select>
      <h2>Instance Select</h2>
      <InstanceSelect
        value={instanceSelectValue}
        onChange={setInstanceSelectValue}
        defaultSelectAll
      />
      <pre>Instance select value = {JSON.stringify(instanceSelectValue)}</pre>
      <h2>Misc</h2>
      <div
        style={{ background: '#f0f0f0', height: 100 }}
        onMouseDown={(e) => {
          e.preventDefault()
        }}
      >
        Prevent Default Area
      </div>
    </Root>
  )
}

export default App
