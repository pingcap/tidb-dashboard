import client from '@/utils/client'
import React, { useEffect, useState } from 'react'
import { message, Card, Form, TreeSelect, Button, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

// FIXME: The following logic should be extracted into a common component.

const namingMap = {
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD',
}

function buildServerMap(info) {
  const serverMap = new Map()
  info.tidb.nodes.forEach(tidb => {
    const addr = `${tidb.ip}:${tidb.status_port}`
    const target = {
      ip: tidb.ip,
      port: tidb.status_port,
      kind: 'tidb',
    }
    serverMap.set(addr, target)
  })
  info.tikv.nodes.forEach(tikv => {
    const addr = `${tikv.ip}:${tikv.status_port}`
    const target = {
      ip: tikv.ip,
      port: tikv.status_port,
      kind: 'tikv',
    }
    serverMap.set(addr, target)
  })
  info.pd.nodes.forEach(pd => {
    const addr = `${pd.ip}:${pd.port}`
    const target = {
      ip: pd.ip,
      port: pd.port,
      kind: 'pd',
    }
    serverMap.set(addr, target)
  })
  return serverMap
}

function buildTreeData(serverMap) {
  const servers = {
    tidb: [],
    tikv: [],
    pd: [],
  }

  serverMap.forEach((target, addr) => {
    const kind = target.kind ?? ''
    if (!(kind in servers)) {
      return
    }
    servers[kind].push({
      title: addr,
      value: `${kind}|${addr}`, // hack
      key: `${kind}${addr}`,
    })
  })

  return Object.keys(servers)
    .filter(kind => servers[kind].length > 0)
    .map(kind => ({
      title: namingMap[kind],
      value: kind,
      key: kind,
      children: servers[kind],
    }))
}

function filterTreeNode(inputValue, treeNode) {
  const name = treeNode.key
  return name.includes(inputValue)
}

const profilingDurationsSec = [10, 30, 60, 120]
const defaultProfilingDuration = 30

export default function Page() {
  const [topology, setTopology] = useState(new Map())

  // FIXME: Use Antd form
  const [nodes, setNodes] = useState([])
  const [duration, setDuration] = useState(defaultProfilingDuration)

  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const history = useHistory()

  useEffect(() => {
    async function fetchData() {
      const res = await client.dashboard.topologyAllGet()
      const serverMap = buildServerMap(res.data)
      setTopology(serverMap)
    }
    fetchData()
  }, [])

  async function handleStart() {
    if (nodes.length === 0) {
      // TODO: Show notification
      return
    }
    setLoading(true)
    const req = {
      tidb: [],
      tikv: [],
      pd: [],
      duration_secs: duration,
    }
    nodes.forEach(n => {
      const [kind, addr] = n.split('|')
      req[kind].push(addr)
    })
    try {
      const res = await client.dashboard.profilingGroupStartPost(req)
      history.push(`/node_profiling/${res.data.id}`)
    } catch (e) {
      // FIXME
      message.error(e.message)
    }
    setLoading(false)
  }

  return (
    <Card bordered={false}>
      <Form layout="inline">
        <Form.Item label={t('node_profiling.index.control_form.nodes.label')}>
          <TreeSelect
            value={nodes}
            treeData={buildTreeData(topology)}
            placeholder={t(
              'node_profiling.index.control_form.nodes.placeholder'
            )}
            onChange={setNodes}
            treeDefaultExpandAll={true}
            treeCheckable={true}
            showCheckedStrategy={TreeSelect.SHOW_CHILD}
            allowClear
            filterTreeNode={filterTreeNode}
            style={{ width: 400 }}
          />
        </Form.Item>
        <Form.Item
          label={t('node_profiling.index.control_form.duration.label')}
        >
          <Select
            value={duration}
            onChange={setDuration}
            style={{ width: 120 }}
          >
            {profilingDurationsSec.map(sec => (
              <Select.Option value={sec} key={sec}>
                {sec}s
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleStart} loading={loading}>
            {t('node_profiling.index.control_form.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
