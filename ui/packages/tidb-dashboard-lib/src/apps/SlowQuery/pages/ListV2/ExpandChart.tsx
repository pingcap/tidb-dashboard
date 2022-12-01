import React, { useState } from 'react'
import { Modal } from 'antd'

import { SlowQueryScatterChart } from './ScatterChart'

interface ExpandChartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ExpandChart: React.FC<ExpandChartProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Modal
      centered
      visible={open}
      onCancel={() => onOpenChange(false)}
      width="100%"
      bodyStyle={{
        height: '768px',
        padding: '10px'
      }}
      footer={null}
    >
      <SlowQueryScatterChart displayOptions={null as any} />
    </Modal>
  )
}
