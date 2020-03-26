import client from '@pingcap-incubator/dashboard_client'
import { LogsearchTaskModel } from '@pingcap-incubator/dashboard_client'
import { Button, Modal, Tree, Skeleton } from 'antd'
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { FailIcon, LoadingIcon, SuccessIcon } from './Icon'
import styles from './Styles.module.css'
import {
  getAddress,
  namingMap,
  ServerType,
  ServerTypeList,
  TaskState,
} from './utils'
import { Card } from '@pingcap-incubator/dashboard_components'

const { confirm } = Modal
const { TreeNode } = Tree

function leafNodeProps(state: number | undefined) {
  switch (state) {
    case TaskState.Running:
      return {
        icon: LoadingIcon,
        disableCheckbox: true,
      }
    case TaskState.Finished:
      return {
        icon: SuccessIcon,
        disableCheckbox: false,
      }
    case TaskState.Error:
      return {
        icon: FailIcon,
        disableCheckbox: true,
      }
    default:
      break
  }
}

function renderLeafNodes(tasks: LogsearchTaskModel[]) {
  return tasks.map((task) => {
    const title = getAddress(task.search_target)
    return (
      <TreeNode
        key={`${task.id}`}
        title={title}
        {...leafNodeProps(task.state)}
      />
    )
  })
}

function parentNodeIcon(tasks: LogsearchTaskModel[]) {
  // Running: has at least one task running
  if (tasks.some((task) => task.state === TaskState.Running)) {
    return LoadingIcon
  }
  // Finished: all tasks are finished
  if (!tasks.some((task) => task.state !== TaskState.Finished)) {
    return SuccessIcon
  }
  // Failed: no task is running, and has failed task
  return FailIcon
}

function parentNodeCheckable(tasks: LogsearchTaskModel[]) {
  // Checkable: at least one task has finished
  return tasks.some((task) => task.state === TaskState.Finished)
}

function useSetInterval(callback: () => void) {
  const ref = useRef<() => void>(callback)

  useEffect(() => {
    ref.current = callback
  })

  useEffect(() => {
    const cb = () => {
      ref.current()
    }
    const timer = setInterval(cb, 1000)
    return () => clearInterval(timer)
  }, [])
}

interface Props {
  taskGroupID: number
  tasks: LogsearchTaskModel[]
  setTasks: Dispatch<SetStateAction<LogsearchTaskModel[]>>
}

export default function SearchProgress({
  taskGroupID,
  tasks,
  setTasks,
}: Props) {
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)

  async function getTasks(taskGroupID: number, tasks: LogsearchTaskModel[]) {
    if (taskGroupID < 0) {
      return
    }
    if (
      tasks.length > 0 &&
      taskGroupID === tasks[0].task_group_id &&
      !tasks.some((task) => task.state === TaskState.Running)
    ) {
      return
    }
    const res = await client.getInstance().logsTaskgroupsIdGet(taskGroupID + '')
    setTasks(res.data.tasks ?? [])
  }

  useSetInterval(() => {
    getTasks(taskGroupID, tasks)
  })

  useEffect(() => {
    if (tasks.length > 0) {
      setLoading(false)
    }
  }, [tasks])

  useEffect(() => {
    setLoading(true)
  }, [taskGroupID])

  const descriptionArray = [
    t('search_logs.progress.running'),
    t('search_logs.progress.success'),
    t('search_logs.progress.failed'),
  ]

  function progressDescription(tasks: LogsearchTaskModel[]) {
    const arr = [0, 0, 0]
    tasks.forEach((task) => {
      const state = task.state
      if (state !== undefined) {
        arr[state - 1]++
      }
    })
    const res: string[] = []
    arr.forEach((count, index) => {
      if (index < 1 || count <= 0) {
        return
      }
      const str = `${count} ${descriptionArray[index]}`
      res.push(str)
    })
    return res.join('，')
  }

  function renderTreeNodes(tasks: LogsearchTaskModel[]) {
    const servers = {
      [ServerType.TiDB]: [],
      [ServerType.TiKV]: [],
      [ServerType.PD]: [],
    }

    tasks.forEach((task) => {
      if (task.search_target?.kind === undefined) {
        return
      }
      servers[task.search_target.kind].push(task)
    })

    return ServerTypeList.filter((kind) => servers[kind].length > 0).map(
      (kind) => {
        const tasks: LogsearchTaskModel[] = servers[kind]
        const title = (
          <span>
            {namingMap[kind]}
            <span
              style={{
                fontSize: '0.8em',
                marginLeft: 5,
              }}
            >
              {progressDescription(tasks)}
            </span>
          </span>
        )
        return (
          <TreeNode
            key={namingMap[kind]}
            title={title}
            icon={parentNodeIcon(tasks)}
            disableCheckbox={!parentNodeCheckable(tasks)}
            children={renderLeafNodes(tasks)}
          />
        )
      }
    )
  }

  async function handleDownload() {
    if (taskGroupID < 0) {
      return
    }
    // filter out all parent node
    const keys = checkedKeys.filter(
      (key) => !Object.keys(namingMap).some((name) => name === key)
    )

    const res = await client.getInstance().logsDownloadAcquireTokenGet(keys)
    const token = res.data
    if (!token) {
      return
    }
    const url = `${client.getBasePath()}/logs/download?token=${token}`
    window.open(url)
  }

  async function handleCancel() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('search_logs.confirm.cancel_tasks'),
      onOk() {
        client.getInstance().logsTaskgroupsIdCancelPost(taskGroupID + '')
        setTasks(
          tasks.map((task) => {
            if (task.state === TaskState.Error) {
              task.state = TaskState.Running
            }
            return task
          })
        )
      },
    })
  }

  async function handleRetry() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('search_logs.confirm.retry_tasks'),
      onOk() {
        client.getInstance().logsTaskgroupsIdRetryPost(taskGroupID + '')
        setTasks(
          tasks.map((task) => {
            if (task.state === TaskState.Error) {
              task.state = TaskState.Running
            }
            return task
          })
        )
      },
    })
  }

  const handleCheck = (checkedKeys, info) => {
    setCheckedKeys(checkedKeys as string[])
  }

  return (
    <Card
      id="search_progress"
      style={{ marginLeft: -48 }}
      title={t('search_logs.common.progress')}
    >
      {loading && <Skeleton active />}
      {!loading && (
        <>
          <div>{progressDescription(tasks)}</div>
          <div className={styles.buttons}>
            <Button
              type="primary"
              onClick={handleDownload}
              disabled={checkedKeys.length < 1}
            >
              {t('search_logs.common.download_selected')}
            </Button>
            <Button
              type="danger"
              onClick={handleCancel}
              disabled={!tasks.some((task) => task.state === TaskState.Running)}
            >
              {t('search_logs.common.cancel')}
            </Button>
            <Button
              onClick={handleRetry}
              disabled={
                tasks.some((task) => task.state === TaskState.Running) ||
                !tasks.some((task) => task.state === TaskState.Error)
              }
            >
              {t('search_logs.common.retry')}
            </Button>
          </div>
          <Tree
            checkable
            expandedKeys={Object.values(namingMap)}
            showIcon
            onCheck={handleCheck}
            style={{ overflowX: 'hidden' }}
          >
            {renderTreeNodes(tasks)}
          </Tree>
        </>
      )}
    </Card>
  )
}
