import client, { DASHBOARD_API_URL } from '@/utils/client';
import { LogsearchSearchTarget, LogsearchTaskModel } from '@/utils/dashboard_client';
import { Button, Card, Modal, Tree, Typography } from 'antd';
import { AntTreeNodeCheckedEvent } from 'antd/lib/tree/Tree';
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Context } from "../store";
import { FailIcon, LoadingIcon, SuccessIcon } from './Icon';
import styles from './SearchProgress.module.css';
import { namingMap, TaskState } from './util';

const { confirm } = Modal;
const { Title } = Typography;
const { TreeNode } = Tree;

function leafNodeProps(state: number | undefined) {
  switch (state) {
    case TaskState.Running:
      return {
        icon: LoadingIcon,
        disableCheckbox: true
      }
    case TaskState.Finished:
      return {
        icon: SuccessIcon,
        disableCheckbox: false
      }
    case TaskState.Error:
      return {
        icon: FailIcon,
        disableCheckbox: true
      }
    default:
      break;
  }
}

function renderLeafNodes(tasks: LogsearchTaskModel[], serverMap: Map<string, LogsearchSearchTarget>) {
  return tasks.map(task => {
    let title = ''
    for (let [addr, target] of serverMap.entries()) {
      if (target.ip === task.search_target?.ip
        && target.port === task.search_target?.port) {
        title = addr
        break
      }
    }
    return (
      <TreeNode
        key={task.id?.toString()}
        value={task.id}
        title={title}
        {...leafNodeProps(task.state)}
      />
    )
  })
}

function parentNodeIcon(tasks: LogsearchTaskModel[]) {
  // Running: has at least one task running
  if (tasks.some(task => task.state === TaskState.Running)) {
    return LoadingIcon
  }
  // Finished: all tasks are finished
  if (!tasks.some(task => task.state !== TaskState.Finished)) {
    return SuccessIcon
  }
  // Failed: no task is running, and has failed task
  return FailIcon
}

function parentNodeCheckable(tasks: LogsearchTaskModel[]) {
  // Checkable: at least one task has finished
  return tasks.some(task => task.state === TaskState.Finished)
}

function useSetInterval(callback: () => void) {
  const ref = useRef<() => void>(callback);

  useEffect(() => {
    ref.current = callback;
  });

  useEffect(() => {
    const cb = () => {
      ref.current()
    };
    const timer = setInterval(cb, 1000)
    return () => clearInterval(timer);
  }, []);
}

function downloadFile(url: string) {
  const link = document.createElement('a');
  link.href = url;
  document.body.appendChild(link);
  link.click();
}

interface Props {
  taskGroupID: number
}

export default function SearchProgress({
  taskGroupID
}: Props) {
  const { store, dispatch } = useContext(Context)
  const { tasks } = store
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const { t } = useTranslation()

  async function getTasks(taskGroupID: number, tasks: LogsearchTaskModel[]) {
    if (taskGroupID < 0) {
      return
    }
    if (tasks.length > 0 &&
      taskGroupID === tasks[0].task_group_id &&
      !tasks.some(task => task.state === TaskState.Running)) {
      return
    }
    const res = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
    dispatch({
      type: 'tasks',
      payload: res.data.tasks ?? []
    })
  }

  useSetInterval(() => {
    getTasks(taskGroupID, tasks)
  });

  const descriptionArray = [
    t('log_searching.progress.running'),
    t('log_searching.progress.success'),
    t('log_searching.progress.failed')
  ]

  function progressDescription(tasks: LogsearchTaskModel[]) {
    const arr = [0, 0, 0]
    tasks.forEach(task => {
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

  function renderTreeNodes(tasks: LogsearchTaskModel[], serverMap: Map<string, LogsearchSearchTarget>) {
    const servers = {
      tidb: [],
      tikv: [],
      pd: []
    }

    tasks.forEach(task => {
      const serverType = task.search_target?.kind ?? ''
      if (!(serverType in servers)) {
        return
      }
      servers[serverType].push(task)
    })

    return Object.keys(servers)
      .filter(key => servers[key].length > 0)
      .map(key => {
        const tasks = servers[key]
        const title = (
          <span>
            {namingMap[key]}
            <span style={{
              fontSize: "0.8em",
              marginLeft: 5
            }}>
              {progressDescription(tasks)}
            </span>
          </span>
        )
        return (
          <TreeNode
            key={key}
            title={title}
            icon={parentNodeIcon(tasks)}
            disableCheckbox={!parentNodeCheckable(tasks)}
            children={renderLeafNodes(tasks, serverMap)}
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
    const keys = checkedKeys.filter(key =>
      !Object.keys(namingMap).some(name =>
        name === key
      )
    )
    
    const res = await client.dashboard.logsDownloadAcquireTokenGet(keys)
    const token = res.data
    if (!token) {
      return
    }
    const url = `${DASHBOARD_API_URL}/logs/download?token=${token}`
    downloadFile(url)
  }

  async function handleCancel() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('log_searching.confirm.cancel_tasks'),
      onOk() {
        client.dashboard.logsTaskgroupsIdCancelPost(taskGroupID)
        dispatch({type: 'tasks', payload: tasks.map(task => {
          if (task.state === TaskState.Error) {
            task.state = TaskState.Running
          }
          return task
        })})
      },
    })
  }

  async function handleRetry() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: t('log_searching.confirm.retry_tasks'),
      onOk() {
        client.dashboard.logsTaskgroupsIdRetryPost(taskGroupID)
        dispatch({type: 'tasks', payload: tasks.map(task => {
          if (task.state === TaskState.Error) {
            task.state = TaskState.Running
          }
          return task
        })})
      },
    })
  }

  function handleCheck(checkedKeys: string[] | { checked: string[]; halfChecked: string[]; }, e: AntTreeNodeCheckedEvent) {
    setCheckedKeys(checkedKeys as string[])
  };

  return (
    <div>
      <Card>
        <Title level={3}>{t('log_searching.common.progress')}</Title>
        <div>{progressDescription(tasks)}</div>
        <div className={styles.buttons}>
          <Button type="primary" onClick={handleDownload} disabled={checkedKeys.length < 1}>{t('log_searching.common.download_selected')}</Button>
          <Button type="danger" onClick={handleCancel} disabled={!tasks.some(task => task.state === TaskState.Running)}>{t('log_searching.common.cancel')}</Button>
          <Button onClick={handleRetry} disabled={tasks.some(task => task.state === TaskState.Running) || !tasks.some(task => task.state === TaskState.Error)}>{t('log_searching.common.retry')}</Button>
        </div>
        <Tree
          checkable
          expandedKeys={Object.keys(namingMap)}
          showIcon
          onCheck={handleCheck}
        >
          {renderTreeNodes(store.tasks, store.topology)}
        </Tree>
      </Card>
    </div>
  )
}
