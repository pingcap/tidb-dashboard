import { Button, Modal, Tree } from 'antd'
import _ from 'lodash'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import client, { LogsearchTaskModel } from '@lib/client'
import { AnimatedSkeleton, Card } from '@lib/components'
import { FailIcon, LoadingIcon, SuccessIcon } from './Icon'
import { namingMap, NodeKind, NodeKindList, TaskState } from '../utils'

import styles from './Styles.module.css'

const { confirm } = Modal
const { TreeNode } = Tree
const taskStateIcons = {
  [TaskState.Running]: LoadingIcon,
  [TaskState.Finished]: SuccessIcon,
  [TaskState.Error]: FailIcon,
}

function leafNodeProps(task: LogsearchTaskModel) {
  return {
    icon: taskStateIcons[task.state || TaskState.Error],
    disableCheckbox: task.size ? task.state != TaskState.Finished : true,
  }
}

function renderLeafNodes(tasks: LogsearchTaskModel[]) {
  return tasks.map((task) => {
    let title = task.target?.display_name ?? ''
    if (task.size) {
      title += ' (' + getValueFormat('bytes')(task.size!, 1) + ')'
    }
    return (
      <TreeNode key={`${task.id}`} title={title} {...leafNodeProps(task)} />
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
  // Checkable: at least one task has finished and the log must not be empty
  return (
    tasks.some((task) => task.state === TaskState.Finished) &&
    tasks.reduce((acc, task) => (acc += task.size || 0), 0) > 0
  )
}

interface Props {
  taskGroupID: number
  tasks: LogsearchTaskModel[]
  toggleReload: () => void
}

export default function SearchProgress({
  taskGroupID,
  tasks,
  toggleReload,
}: Props) {
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { t } = useTranslation()

  useEffect(() => {
    if (tasks !== undefined && tasks.length > 0) {
      setIsLoading(false)
    }
  }, [tasks])

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
    return (
      res.join('，') +
      ' (' +
      getValueFormat('bytes')(_.sumBy(tasks, 'size'), 1) +
      ')'
    )
  }

  function renderTreeNodes(tasks: LogsearchTaskModel[]) {
    const servers = {
      [NodeKind.TiDB]: [],
      [NodeKind.TiKV]: [],
      [NodeKind.PD]: [],
      [NodeKind.TiFlash]: [],
    }

    tasks.forEach((task) => {
      if (task.target?.kind === undefined) {
        return
      }
      servers[task.target.kind].push(task)
    })

    return NodeKindList.filter((kind) => servers[kind].length > 0).map(
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
        toggleReload()
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
        toggleReload()
      },
    })
  }

  const handleCheck = (checkedKeys) => {
    setCheckedKeys(checkedKeys as string[])
  }

  return (
    <Card
      id="search_progress"
      style={{ marginLeft: -48 }}
      title={t('search_logs.common.progress')}
    >
      <AnimatedSkeleton showSkeleton={isLoading}>
        {tasks && (
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
                disabled={
                  !tasks.some((task) => task.state === TaskState.Running)
                }
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
      </AnimatedSkeleton>
    </Card>
  )
}
