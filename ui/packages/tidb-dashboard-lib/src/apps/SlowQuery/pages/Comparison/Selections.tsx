import React from 'react'
import { Select, Space } from 'antd'

import { Toolbar } from '@lib/components'
import styles from './Comparison.module.less'
import { AGGR_BY, DisplayOptions, GROUP_BY } from '../ListV2/Selections'

interface SelectionsProps {
  selection: DisplayOptions
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof DisplayOptions]: any }>>
  ) => void
}

export const Selections: React.FC<SelectionsProps> = ({
  selection,
  onSelectionChange
}) => {
  return (
    <Toolbar className={styles.compar_toolbar}>
      <Space>
        <div>
          <span style={{ marginRight: '6px' }}>Aggregate By:</span>
          <Select
            defaultValue={selection.aggrBy}
            style={{ width: 150 }}
            options={AGGR_BY}
            onChange={(v) => onSelectionChange({ aggrBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Group By:</span>
          <Select
            defaultValue={selection.groupBy}
            style={{ width: 150 }}
            options={GROUP_BY}
            onChange={(v) => onSelectionChange({ groupBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Use TiFlash:</span>
          <Select
            defaultValue={selection.tiflash}
            style={{ width: 150 }}
            options={[
              {
                value: 'all',
                label: 'All'
              },
              {
                value: 'yes',
                label: 'Yes'
              },
              {
                value: 'no',
                label: 'No'
              }
            ]}
            onChange={(v) => onSelectionChange({ tiflash: v })}
          />
        </div>
      </Space>
    </Toolbar>
  )
}
