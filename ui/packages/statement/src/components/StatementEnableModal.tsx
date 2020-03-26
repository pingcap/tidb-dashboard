import React, { useState, useEffect } from 'react'
import { Modal, message, Button } from 'antd'
import moment from 'moment'

interface Props {
  visible: boolean
  onOK: (instanceId: string) => Promise<any>
  onClose: () => void
  onData: () => void
  onSetting: () => void

  instanceId: string
}

function StatementEnableModal({
  visible,
  onOK,
  onClose,
  onData,
  onSetting,
  instanceId,
}: Props) {
  const [curTime, setCurTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurTime(moment().format('YYYY-MM-DD HH:mm:ss'))
    const timer = setInterval(() => {
      setCurTime(moment().format('YYYY-MM-DD HH:mm:ss'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleOk() {
    setSubmitting(true)
    const res = await onOK(instanceId)
    setSubmitting(false)
    if (res !== undefined) {
      message.success(`${instanceId} 开启 Statement 统计成功`)
      onData()
      onClose()
    }
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      title="开启 Statement 统计"
    >
      <div>
        开启前请确认设置：
        <Button type="primary" onClick={onSetting}>
          设置
        </Button>
      </div>
      <div>开始统计时间：{curTime}</div>
      <div style={{ color: 'red' }}>
        注：诊断工具开启关闭 Statement 功能，TiDB 配置将随之开启关闭
      </div>
    </Modal>
  )
}

export default StatementEnableModal
