import client from '@/utils/client'
import React, { useEffect, useState } from 'react'
import { message, Card, Form, TreeSelect, Button, Select, Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

// FIXME: The following logic should be extracted into a common component.
function getTreeData(topologyMap) {
  const treeDataByKind = {
    tidb: [],
    tikv: [],
    pd: [],
  }
  Object.values(topologyMap).forEach(target => {
    if (!(target.kind in treeDataByKind)) {
      return
    }
    treeDataByKind[target.kind].push({
      title: target.display_name,
      value: target.display_name,
      key: target.display_name,
    })
  })
  const kindTitleMap = {
    tidb: 'TiDB',
    tikv: 'TiKV',
    pd: 'PD',
  }
  return Object.keys(treeDataByKind)
    .filter(kind => treeDataByKind[kind].length > 0)
    .map(kind => ({
      title: kindTitleMap[kind],
      value: kind,
      key: kind,
      children: treeDataByKind[kind],
    }))
}

function filterTreeNode(inputValue, treeNode) {
  const name = treeNode.key
  return name.includes(inputValue)
}

async function getTargetsMapAsync() {
  const res = await client.dashboard.topologyAllGet()
  const map = {}
  res.data.tidb.nodes.forEach(node => {
    const display = `${node.ip}:${node.port}`
    const target = {
      kind: 'tidb',
      display_name: display,
      ip: node.ip,
      port: node.status_port,
    }
    map[display] = target
  })
  res.data.tikv.nodes.forEach(node => {
    const display = `${node.ip}:${node.port}`
    const target = {
      kind: 'tikv',
      display_name: display,
      ip: node.ip,
      port: node.status_port,
    }
    map[display] = target
  })
  res.data.pd.nodes.forEach(node => {
    const display = `${node.ip}:${node.port}`
    const target = {
      kind: 'pd',
      display_name: display,
      ip: node.ip,
      port: node.port,
    }
    map[display] = target
  })
  return map
}

const profilingDurationsSec = [10, 30, 60, 120]
const defaultProfilingDuration = 30

export default function Page() {
  const [targetsMap, setTargetsMap] = useState({})

  // FIXME: Use Antd form
  const [selectedTargets, setSelectedTargets] = useState([])
  const [duration, setDuration] = useState(defaultProfilingDuration)

  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const history = useHistory()

  useEffect(() => {
    async function fetchData() {
      setTargetsMap(await getTargetsMapAsync())
    }
    fetchData()
  }, [])

  async function handleStart() {
    if (selectedTargets.length === 0) {
      // TODO: Show notification
      return
    }
    setLoading(true)
    const req = {
      targets: selectedTargets.map(k => targetsMap[k]),
      duration_secs: duration,
    }
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
    <div>
      <Card bordered={false}>
        <Form layout="inline">
          <Form.Item label={t('node_profiling.index.control_form.nodes.label')}>
            <TreeSelect
              value={selectedTargets}
              treeData={getTreeData(targetsMap)}
              placeholder={t(
                'node_profiling.index.control_form.nodes.placeholder'
              )}
              onChange={setSelectedTargets}
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
      <Card
        title="Profiling History"
        bordered={false}
        bodyStyle={{ padding: 0 }}
        style={{ marginTop: 24 }}
      >
        <Table columns={[]} dataSource={[]} size="middle" />
      </Card>
    </div>
  )
}
