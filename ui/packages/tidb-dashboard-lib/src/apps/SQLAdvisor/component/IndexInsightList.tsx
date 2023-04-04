import React, {
  useEffect,
  useContext,
  useState,
  useRef,
  MutableRefObject
} from 'react'

import IndexInsightTable, { useSQLTunedListGet } from './IndexInsightTable'

import {
  Space,
  Button,
  Typography,
  notification,
  // Alert,
  Modal,
  Tooltip,
  Drawer,
  Checkbox
} from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { Card, Toolbar } from '@lib/components'
import { SQLAdvisorContext } from '../context'
import dayjs from 'dayjs'
import { PerfInsightTask, PerfInsightTaskStatus } from '../types'

interface IndexInsightListProps {
  onHandleDeactivate?: () => void
  isDeactivating?: boolean
}

const CHECK_TASK_INTERVAL = 60 * 1000

const IndexInsightList = ({
  onHandleDeactivate,
  isDeactivating
}: IndexInsightListProps) => {
  const ctx = useContext(SQLAdvisorContext)
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false)
  const { sqlTunedList, refreshSQLTunedList, loading } = useSQLTunedListGet()
  // const [showAlert, setShowAlert] = useState<boolean>(false)
  const [showSetting, setShowSetting] = useState(false)
  const [showCheckUpModal, setShowCheckUpModal] = useState(false)
  const [taskStatus, setTaskStatus] = useState<PerfInsightTaskStatus>()
  const isTaskRunning = taskStatus === 'running' || taskStatus === 'created'
  const latestTask = useRef<PerfInsightTask>(null) as MutableRefObject<
    PerfInsightTask | undefined
  >
  const dontRemindCheckUpNotice = useRef(
    JSON.parse(
      localStorage.getItem('index_insight_dont_remind_checkup_notice') ||
        'false'
    )
  )

  const timer = useRef(0)
  const checkStatusLoop = useRef(async () => {
    clearTimeout(timer.current)

    try {
      const res = await ctx?.ds.tuningLatestGet()
      latestTask.current = res

      // No tasks
      if (!res) {
        return
      }

      setTaskStatus(res.status)

      if (res.status === 'failed') {
        notification.error({
          message: 'Last Task Error',
          description: res.last_failed_message || 'Unknown error'
        })
      }

      if (res.status !== 'succeeded' && res.status !== 'failed') {
        timer.current = window.setTimeout(async () => {
          const nextRes = await checkStatusLoop.current()
          // refresh when status change: !successed -> successed
          if (nextRes?.status === 'succeeded') {
            refreshSQLTunedList()
          }
        }, CHECK_TASK_INTERVAL)
      }

      return res
    } catch (e) {
      latestTask.current = undefined
      setTaskStatus('failed')
      throw e
    }
  })

  useEffect(() => {
    checkStatusLoop.current()
    return () => window.clearTimeout(timer.current)
  }, [ctx])

  const handleCheckUpTask = async () => {
    try {
      await ctx?.ds.tuningTaskCreate(
        (dayjs().unix() - 3 * 60 * 60) * 1000,
        dayjs().unix() * 1000
      )
      notification.success({
        message: 'Successed'
      })
    } catch (e: any) {
      notification.error({
        message: e.message
      })
    } finally {
      checkStatusLoop.current()
    }
  }
  const handleCancelTask = async () => {
    try {
      await ctx?.ds.tuningTaskCancel(latestTask.current!.task_id)
      notification.success({
        message: 'Successed'
      })
    } catch (e: any) {
      notification.error({
        message: e.message
      })
    } finally {
      checkStatusLoop.current()
    }
  }

  const hanleDeactivate = () => {
    setShowDeactivateModal(false)
    setShowSetting(false)
    onHandleDeactivate?.()
  }

  const handleDeactivateModalCancel = () => {
    setShowDeactivateModal(false)
    setShowSetting(false)
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
              title="Each insight will cover diagnosis data from the past 3 hours."
              placement="rightTop"
            >
              <InfoCircleOutlined />
            </Tooltip>
            <Button
              disabled={isTaskRunning}
              onClick={() => {
                // if index_insight_dont_remind_checkup_notice has been checked, don't show comfirm modal again, checkup directly.
                if (!dontRemindCheckUpNotice.current) {
                  setShowCheckUpModal(true)
                } else {
                  handleCheckUpTask()
                }
              }}
              loading={isTaskRunning}
            >
              {isTaskRunning ? 'Task is Running' : 'Check Up'}
            </Button>
            {isTaskRunning && (
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
                // FIXME: set value after confirmed
                onChange={(e) =>
                  (dontRemindCheckUpNotice.current = e.target.checked)
                }
              >
                Don't remind me again.
              </Checkbox>
              <Button
                onClick={async () => {
                  await handleCheckUpTask()
                  setShowCheckUpModal(false)
                }}
                type="primary"
              >
                Comfirm
              </Button>
            </Space>
          </div>
        </Modal>
        {/* {showAlert && (
          <Alert
            message="The SQL user being used during activation is no longer available, please deactivate the function first and then reactivate the function to use it."
            type="warning"
            showIcon
            closable
          />
        )} */}
      </Card>
      <IndexInsightTable
        sqlTunedList={sqlTunedList}
        loading={loading}
        onHandlePaginationChange={refreshSQLTunedList}
      />
    </>
  )
}

export default IndexInsightList
