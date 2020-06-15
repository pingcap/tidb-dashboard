import React, { useState, useRef, useMemo } from 'react'
import {
  Root,
  BaseSelect,
  InstanceSelect,
  IInstanceSelectRefProps,
  Pre,
  MultiSelect,
} from '@lib/components'
import { Select, Button } from 'antd'

const InstanceSelectRegion = () => {
  const [instanceSelectValue, setInstanceSelectValue] = useState<string[]>([])
  const s = useRef<IInstanceSelectRefProps>(null)

  return (
    <>
      <h2>Instance Select</h2>
      <InstanceSelect
        value={instanceSelectValue}
        onChange={setInstanceSelectValue}
        defaultSelectAll
        ref={s}
      />
      <InstanceSelect placeholder="Uncontrolled Value" />
      <div>
        <Pre>Instance select value = {JSON.stringify(instanceSelectValue)}</Pre>
        <Pre>
          Instance select value instances ={' '}
          {JSON.stringify(
            s.current && s.current.getInstanceByKeys(instanceSelectValue)
          )}
        </Pre>
      </div>
    </>
  )
}

const MultiSelectRegion = () => {
  const [items, items2] = useMemo(() => {
    const items: any[] = []
    const items2: any[] = []
    for (let i = 0; i < 100; i++) {
      items.push({ key: String(i), label: `Item ${i}` })
      items2.push({
        key: String(i),
        label: `Long Long Long Long Long Long Item ${i}`,
      })
    }
    return [items, items2]
  }, [])

  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <h2>Multi Select</h2>
      <MultiSelect placeholder="Uncontrolled Value" items={items} />
      <MultiSelect onChange={setValue} items={items2} />
      <div>
        <Pre>Value = {JSON.stringify(value)}</Pre>
      </div>
    </>
  )
}

const App = () => {
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
      <InstanceSelectRegion />
      <MultiSelectRegion />
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
