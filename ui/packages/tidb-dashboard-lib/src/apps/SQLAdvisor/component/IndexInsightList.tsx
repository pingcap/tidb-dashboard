import React, { useEffect, useContext, useState, useRef } from 'react'

import IndexInsightTable, { useSQLTunedListGet } from './IndexInsightTable'

import {
  Space,
  Button,
  Typography,
  notification,
  Alert,
  Modal,
  Tooltip
} from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { Card, Toolbar } from '@lib/components'
import { SQLAdvisorContext } from '../context'
import dayjs from 'dayjs'

const ONE_DAY = 24 * 60 * 60 // unit: second

interface IndexInsightListProps {
  onHandleDeactivate?: () => void
  isDeactivating?: boolean
}

const IndexInsightList = ({
  onHandleDeactivate,
  isDeactivating
}: IndexInsightListProps) => {
  const ctx = useContext(SQLAdvisorContext)
  const [showAlert, setShowAlert] = useState<boolean>(false)
  const [noTaskRunning, setNoTaskRunning] = useState<boolean>(true)
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false)

  const { sqlTunedList, refreshSQLTunedList, loading } = useSQLTunedListGet()

  const taskRunningStatusGet = useRef(() => {
    return ctx?.ds
      .tuningTaskStatusGet()
      .then((data) => {
        setNoTaskRunning(data)
        return data
      })
      .catch((e) => console.log(e))
  })

  const timer = useRef(0)
  const startCheckTaskStatusLoop = useRef(() => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const _noTaskRunning = (await taskRunningStatusGet.current()) as boolean
      if (_noTaskRunning) {
        refreshSQLTunedList()
        return
      }
      startCheckTaskStatusLoop.current()
    }, 1000 * 60)
  })

  useEffect(() => {
    const checkStatus = async () => {
      const _noTaskRunning = (await taskRunningStatusGet.current()) as boolean
      if (!_noTaskRunning) {
        startCheckTaskStatusLoop.current()
      }
    }
    checkStatus()
  }, [])

  useEffect(() => {
    const checkSQLValidation = async () => {
      await ctx?.ds
        .sqlValidationGet?.()
        .then((res) => {
          setShowAlert(!res)
        })
        .catch((e) => console.log(e))
    }

    checkSQLValidation()
  }, [ctx])

  const handleIndexCheckUp = async () => {
    setNoTaskRunning(false)
    await ctx?.ds
      .tuningTaskCreate(
        (dayjs().unix() - ONE_DAY) * 1000,
        dayjs().unix() * 1000
      )
      .then((res) => {
        if (res.code === 'success') {
          notification.success({
            message: res.message
          })
        } else {
          notification.error({
            message: res.message
          })
        }
      })
      .catch((e) => console.log(e))
    startCheckTaskStatusLoop.current()
  }

  const hanleDeactivate = () => {
    setShowDeactivateModal(false)
    onHandleDeactivate?.()
  }

  return (
    <>
      <Card>
        <Toolbar>
          <Space>
            <Typography.Title level={4}>Performance Insight</Typography.Title>
          </Space>
          <Space align="center" size={8}>
            <Button
              disabled={!noTaskRunning || showAlert}
              onClick={handleIndexCheckUp}
              loading={!noTaskRunning}
            >
              {noTaskRunning ? 'Seeking Insight' : 'Task is Running'}
            </Button>
            <Button
              onClick={() => setShowDeactivateModal(true)}
              loading={isDeactivating}
            >
              Deactivate
            </Button>
            <Tooltip
              title="Each insight will cover diagnosis data from the past 24 hours."
              placement="rightTop"
            >
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        </Toolbar>
        <Modal
          title="Deactivate Perfomance Insight"
          visible={showDeactivateModal}
          onCancel={() => setShowDeactivateModal(false)}
          destroyOnClose={true}
          onOk={hanleDeactivate}
        >
          <p>
            After deactivation, the system will delete all data including SQL
            user account and passwords, and all historical insights data.
          </p>
        </Modal>
        {showAlert && (
          <Alert
            message="The SQL user being used during activation is no longer available, please deactivate the function first and then reactivate the function to use it."
            type="warning"
            showIcon
            closable
          />
        )}
      </Card>
      <IndexInsightTable sqlTunedList={sqlTunedList} loading={loading} />
    </>
  )
}

export default IndexInsightList
