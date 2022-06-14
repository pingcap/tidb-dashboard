import React, { useState } from 'react'
import { Pre } from '@lib/components'

import MultiSelect from '.'

export default {
  title: 'Select/Multi Select'
}

function genItems() {
  const items: any[] = []
  const items2: any[] = []
  for (let i = 0; i < 100; i++) {
    items.push({ key: String(i), label: `Item ${i}` })
    items2.push({
      key: String(i),
      label: `Long Long Long Long Long Long Item ${i}`
    })
  }
  return [items, items2]
}
const [items, items2] = genItems()

const MultiSelectRegion = () => {
  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <MultiSelect onChange={setValue} items={items2} />
      <div style={{ marginTop: 12 }}>
        <Pre>Value = {JSON.stringify(value)}</Pre>
      </div>
    </>
  )
}

export const uncontrolled = () => (
  <MultiSelect placeholder="Uncontrolled Value" items={items} />
)

export const controlled = () => <MultiSelectRegion />
