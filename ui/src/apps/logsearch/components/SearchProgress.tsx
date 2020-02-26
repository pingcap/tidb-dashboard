import client, { DASHBOARD_API_URL } from '@/utils/client';
import { LogsearchTaskModel } from '@/utils/dashboard_client';
import { Button, Modal, Tree, Typography } from 'antd';
import { AntTreeNodeCheckedEvent } from 'antd/lib/tree/Tree';
import React, { useContext, useEffect, useRef, useState } from "react";
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

function renderLeafNodes(tasks: LogsearchTaskModel[]) {
  return tasks.map(task => (
    <TreeNode
      key={task.id?.toString()}
      value={task.id}
      title={`${task.search_target?.ip}:${task.search_target?.port}`}
      {...leafNodeProps(task.state)}
    />
  ))
}

function progressDescription(tasks: LogsearchTaskModel[]) {
  const descriptionArray = [
    '正在运行',
    '成功',
    '失败'
  ]

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



function renderTreeNodes(tasks: LogsearchTaskModel[]) {
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
    .filter(key => servers[key].length)
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
          children={renderLeafNodes(tasks)}
        />
      )
    }
    )
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

export default function SearchProgress() {
  const { store, dispatch } = useContext(Context)
  const { taskGroupID, tasks } = store
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])

  async function getTasks(taskGroupID: number) {
    if (taskGroupID < 0) {
      return
    }
    const res = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
    dispatch({
      type: 'tasks',
      payload: res.data.tasks ?? []
    })
  }

  useSetInterval(() => {
    getTasks(taskGroupID)
  });

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
    // 手动拼接下载链接 <a> + click 方式下载
    const params = keys.map(id => `id=${id}`).join('&')
    const url = `${DASHBOARD_API_URL}/logs/download?${params}`
    downloadFile(url)
  }

  async function handleCancel() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: '确认要取消正在运行的日志搜索任务么？',
      onOk() {
        client.dashboard.logsTaskgroupsIdCancelPost(taskGroupID)
      },
    });
  }

  async function handleRetry() {
    if (taskGroupID < 0) {
      return
    }
    confirm({
      title: '确认要重试所有失败的日志搜索任务么？',
      onOk() {
        client.dashboard.logsTaskgroupsIdRetryPost(taskGroupID)
      },
    });
  }

  function handleCheck(checkedKeys: string[] | { checked: string[]; halfChecked: string[]; }, e: AntTreeNodeCheckedEvent) {
    setCheckedKeys(checkedKeys as string[])
  };

  return (
    <div>
      <Title level={3}>搜索进度</Title>
      <div>{progressDescription(tasks)}</div>
      <div className={styles.buttons}>
        <Button type="primary" onClick={handleDownload}>下载选中日志</Button>
        <Button type="danger" onClick={handleCancel}>取消搜索</Button>
        <Button onClick={handleRetry}>重试任务</Button>
      </div>
      <Tree
        checkable
        expandedKeys={Object.keys(namingMap)}
        showIcon
        onCheck={handleCheck}
      >
        {renderTreeNodes(store.tasks)}
      </Tree>
    </div>
  )
}