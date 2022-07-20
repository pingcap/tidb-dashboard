import { Button, Modal, Tree } from 'antd'
import _ from 'lodash'
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext
} from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { LogsearchTaskModel } from '@lib/client'
import { AnimatedSkeleton } from '@lib/components'
import { FailIcon, LoadingIcon, SuccessIcon } from './Icon'
import { TaskState } from '../utils'

import styles from './Styles.module.less'
import { instanceKindName, InstanceKinds } from '@lib/utils/instanceTable'
import { SearchLogsContext } from '../context'

const { confirm } = Modal
const taskStateIcons = {
  [TaskState.Running]: LoadingIcon,
  [TaskState.Finished]: SuccessIcon,
  [TaskState.Error]: FailIcon
}

function getLeafNodes(tasks: LogsearchTaskModel[]) {
  return tasks.map((task) => {
    const title = (
      <span>
        {task.target?.display_name ?? ''}{' '}
        <small>({getValueFormat('bytes')(task.size!, 1)})</small>
      </span>
    )
    return {
      key: String(task.id),
      title,
      icon: taskStateIcons[task.state || TaskState.Error],
      disableCheckbox: !task.size || task.state !== TaskState.Finished
    }
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
  toggleReload
}: Props) {
  const ctx = useContext(SearchLogsContext)

  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { t } = useTranslation()

  useEffect(() => {
    if (tasks !== undefined && tasks.length > 0) {
      setIsLoading(false)
    }
  }, [tasks])

  const descriptionArray = useMemo(
    () => [
      t('search_logs.progress.running'),
      t('search_logs.progress.success'),
      t('search_logs.progress.failed')
    ],
    [t]
  )

  const describeProgress = useCallback(
    (tasks: LogsearchTaskModel[]) => {
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
        res.join(', ') +
        ' (' +
        getValueFormat('bytes')(_.sumBy(tasks, 'size'), 1) +
        ')'
      )
    },
    [descriptionArray]
  )

  const treeData = useMemo(() => {
    const data: any[] = []
    const tasksByIK = _.groupBy(tasks, (t) => t.target?.kind)
    InstanceKinds.forEach((ik) => {
      const tasks = tasksByIK[ik]
      if (!tasks) {
        return
      }
      const title = (
        <span>
          {instanceKindName(ik)} <small>{describeProgress(tasks)}</small>
        </span>
      )
      data.push({
        title,
        key: ik,
        icon: parentNodeIcon(tasks),
        disableCheckbox: !parentNodeCheckable(tasks),
        children: getLeafNodes(tasks)
      })
    })
    return data
  }, [tasks, describeProgress])

  async function handleDownload() {
    if (taskGroupID < 0) {
      return
    }
    // filter out all parent node
    const keys = checkedKeys.filter(
      (key) => !InstanceKinds.some((ik) => ik === key)
    )

    const res = await ctx!.ds.logsDownloadAcquireTokenGet(keys)
    const token = res.data
    if (!token) {
      return
    }
    const url = `${ctx!.cfg.apiPathBase}/logs/download?token=${token}`
    window.location.href = url
  }

  async function handleCancel() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('search_logs.confirm.cancel_tasks'),
      onOk() {
        ctx!.ds.logsTaskgroupsIdCancelPost(taskGroupID + '')
        toggleReload()
      }
    })
  }

  async function handleRetry() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('search_logs.confirm.retry_tasks'),
      onOk() {
        ctx!.ds.logsTaskgroupsIdRetryPost(taskGroupID + '')
        toggleReload()
      }
    })
  }

  const handleCheck = useCallback((checkedKeys) => {
    setCheckedKeys(checkedKeys as string[])
  }, [])

  return (
    <AnimatedSkeleton showSkeleton={isLoading}>
      {tasks && (
        <>
          <div>{describeProgress(tasks)}</div>
          <div className={styles.buttons}>
            <Button
              type="primary"
              onClick={handleDownload}
              disabled={checkedKeys.length < 1}
            >
              {t('search_logs.common.download_selected')}
            </Button>
            <Button
              danger
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
            expandedKeys={[...InstanceKinds]}
            selectable={false}
            defaultExpandAll
            showIcon
            onCheck={handleCheck}
            style={{ overflowX: 'hidden' }}
            treeData={treeData}
          />
        </>
      )}
    </AnimatedSkeleton>
  )
}
