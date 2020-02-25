import { Typography, Button, Tree, Modal } from 'antd';
import React, {useContext, useEffect, MouseEvent} from "react";
import styles from './SearchProgress.module.css'
import { Context } from "../store";
import client from '@/utils/client';
import { LogsearchTaskModel } from '@/utils/dashboard_client';
import { LoadingIcon, SuccessIcon, FailIcon } from './Icon'

const { confirm } = Modal;
const { Title } = Typography;
const {TreeNode} = Tree;

function leafNodeProps(state: string|undefined) {
  switch (state) {
    case 'running':
      return {
        icon: LoadingIcon,
        disableCheckbox: true
      }
    case 'finished':
      return {
        icon: SuccessIcon,
        disableCheckbox: false
      }
    case 'canceled':
      return {
        icon: FailIcon,
        disableCheckbox: true
      }
    default:
      break;
  }
}

function renderLeafNodes(tasks :LogsearchTaskModel[]) {
  return tasks.map(task => (
    <TreeNode
      key={task.task_id}
      value={task.task_id}
      title={`${task.component?.ip}:${task.component?.port}`}
      {...leafNodeProps(task.state)}
    />
  ))
}

function progressDescription(tasks: LogsearchTaskModel[]) {
  const stateMap = {
    'running': 0,
    'finished': 1,
    'canceled': 2
  }
  const descriptionArray = [
    '正在运行',
    '成功',
    '失败'
  ]

  const arr = [0,0,0]
  tasks.forEach(task => {
    const state = task.state ?? ''
    if (!(state in stateMap)) {
      return
    }
    arr[stateMap[state]]++
  })
  const res: string[] = []
  arr.forEach((count, index) => {
    if (count <= 0) {
      return
    }
    const str = `${count} ${descriptionArray[index]}`
    res.push(str)
  })
  return res.join('，')
}

function parentNodeIcon(tasks: LogsearchTaskModel[]) {
  // Running: has at least one task running
  if (tasks.some(task => task.state === 'running')) {
    return LoadingIcon
  }
  // Finished: all tasks are finished
  if (!tasks.some(task => task.state !== 'finished')) {
    return SuccessIcon
  }
  // Failed: no task is running, and has failed task
  return FailIcon
}

function parentNodeCheckable(tasks: LogsearchTaskModel[]) {
  // Checkable: at least one task has finished
  return tasks.some(task => task.state === 'finished')
}

function renderTreeNodes (tasks: LogsearchTaskModel[]) {
  const namingMap = {
    tidb: 'TiDB',
    tikv: 'TiKV',
    pd: 'PD'
  }
  const servers = {
    tidb: [],
    tikv: [],
    pd: []
  }

  tasks.forEach(task => {
    const serverType = task.component?.server_type ?? ''
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

export default function SearchProgress() {
  const { store, dispatch } = useContext(Context)
  const { taskGroupID, tasks } = store

  async function getTasks() {
    if (!taskGroupID) {
      return
    }
    const res = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
    dispatch({
      type: 'tasks',
      payload: res.data
    })
  }

  useEffect(() => {
    getTasks();
    const pollForData = setInterval(() => getTasks(), 1000);
    return () => {
      clearTimeout(pollForData);
    };
  }, []);

  async function handleDownload() {
    if (!taskGroupID) {
      return
    }
    // TODO: fix this url
    // client.dashboard.logsDownloadGet()
  }

  async function handleCancel() {
    if (!taskGroupID) {
      return
    }
    confirm({
      title: '确认要取消正在运行的日志搜索任务么？',
      onOk() {
        // client.dashboard.logsTaskgroupsIdCancelPost(taskGroupID)
      },
      onCancel() {},
    });
  }

  async function handleRetry() {
    if (!taskGroupID) {
      return
    }
    confirm({
      title: '确认要重试所有失败的日志搜索任务么？',
      onOk() {
        // client.dashboard.logsTaskgroupsIdRetryPost(taskGroupID)
      },
      onCancel() {},
    });
  }

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
        autoExpandParent
        showIcon
      >
        {renderTreeNodes(store.tasks)}
      </Tree>
    </div>
  )
}