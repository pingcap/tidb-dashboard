import React, { useEffect, useContext, useState, useRef } from 'react'

import IndexInsightTable, { useSQLTunedListGet } from './IndexInsightTable'

import {
  Space,
  Button,
  Typography,
  notification,
  Alert,
  Modal,
  Tooltip,
  Drawer,
  Checkbox
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
  const [showSetting, setShowSetting] = useState(false)
  const [showCheckUpModal, setShowCheckUpModal] = useState(false)
  const [dontRemindCheckUpNotice, setDontRemindCheckUpNotice] = useState<
    string | boolean
  >(localStorage.getItem('dont_remind_checkup_notice') || false)
  const { sqlTunedList, refreshSQLTunedList, loading } = useSQLTunedListGet()
  const [cancelRunningTask, setCancelRunningTask] = useState(false)

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
  }, [cancelRunningTask])

  useEffect(() => {
    const checkSQLValidation = async () => {
      try {
        const res = await ctx?.ds.sqlValidationGet?.()
        setShowAlert(!res)
      } catch (e) {
        console.log(e)
      }
    }

    checkSQLValidation()
  }, [ctx])

  const handleIndexCheckUp = async () => {
    try {
      const res = await ctx?.ds.tuningTaskCreate(
        (dayjs().unix() - ONE_DAY) * 1000,
        dayjs().unix() * 1000
      )
      if (res.code === 'success') {
        notification.success({
          message: res.message
        })
      } else {
        notification.error({
          message: res.message
        })
      }
    } catch (e) {
      console.log(e)
    } finally {
      setNoTaskRunning(false)
      setShowCheckUpModal(false)
      localStorage.setItem(
        'dont_remind_checkup_notice',
        JSON.stringify(dontRemindCheckUpNotice)
      )
      startCheckTaskStatusLoop.current()
      setCancelRunningTask(false)
    }
  }

  const hanleDeactivate = () => {
    setShowDeactivateModal(false)
    setShowSetting(false)
    onHandleDeactivate?.()
  }

  const handleCancelTask = async () => {
    try {
      const res = await ctx?.ds.cancelRunningTask?.()
      if (res.code === 'success') {
        notification.success({
          message: res.message
        })
      } else {
        notification.error({
          message: res.message
        })
      }
    } catch (e) {
      console.log(e)
    } finally {
      setCancelRunningTask(true)
    }
  }

  const handleDeactivateModalCancel = () => {
    setShowDeactivateModal(false)
    setShowSetting(false)
  }

  const handleCheckUpBtnClick = () => {
    // if dont_remind_checkup_notice has been checked, don't show comfirm modal again, checkup directly.
    if (!dontRemindCheckUpNotice) {
      setShowCheckUpModal(true)
    } else {
      handleIndexCheckUp()
    }
  }

  const handlePaginationChange = (pageNumber: number, pageSize: number) => {
    refreshSQLTunedList(pageNumber, pageSize)
  }

  return (
    <>
      <Card>
        <Toolbar>
          <Space align="center">
            <Typography.Title level={4}>Performance Insight</Typography.Title>
          </Space>
          <Space align="center" style={{ marginTop: 0 }}>
            <Tooltip
              title="Each insight will cover diagnosis data from the past 24 hours."
              placement="rightTop"
            >
              <InfoCircleOutlined />
            </Tooltip>
            <Button
              disabled={!noTaskRunning || showAlert}
              onClick={handleCheckUpBtnClick}
              loading={!noTaskRunning}
            >
              {noTaskRunning ? 'Check Up' : 'Task is Running'}
            </Button>
            {!noTaskRunning && (
              <Button onClick={handleCancelTask}>Cancel Task</Button>
            )}
            <Button onClick={() => setShowSetting(true)}>Setting</Button>
          </Space>
        </Toolbar>
        <Drawer
          title="Setting"
          width={300}
          visible={showSetting}
          closable={true}
          onClose={() => setShowSetting(false)}
          destroyOnClose={true}
        >
          <p>
            After deactivation, the system will delete all historical insight
            data.
          </p>
          <Button
            onClick={() => setShowDeactivateModal(true)}
            loading={isDeactivating}
          >
            Deactivate
          </Button>
        </Drawer>
        <Modal
          title="Deactivate Perfomance Insight"
          visible={showDeactivateModal}
          onCancel={handleDeactivateModalCancel}
          destroyOnClose={true}
          onOk={hanleDeactivate}
        >
          <p>
            After disabling, all insight data generated by this feature will be
            deleted.
          </p>
        </Modal>
        <Modal
          title="Check Up Notice"
          visible={showCheckUpModal}
          onCancel={() => setShowCheckUpModal(false)}
          destroyOnClose={true}
          footer={null}
        >
          <p>
            When performing checks, system tables are queried. It is not
            recommended to perform checks when the cluster is already under
            heavy load.
          </p>
          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" align="center">
              <Checkbox
                onChange={(e) => setDontRemindCheckUpNotice(e.target.checked)}
              >
                Don't remind me again.
              </Checkbox>
              <Button onClick={handleIndexCheckUp} type="primary">
                Comfirm
              </Button>
            </Space>
          </div>
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
      <IndexInsightTable
        sqlTunedList={sqlTunedList}
        loading={loading}
        onHandlePaginationChange={handlePaginationChange}
      />
    </>
  )
}

export default IndexInsightList
