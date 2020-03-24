import client from '@pingcap-incubator/dashboard_client'
import React, { useEffect, useState } from 'react'
import { message, Form, TreeSelect, Button, Select, Badge } from 'antd'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { Link } from 'react-router-dom'
import DateTime from '@/components/DateTime'
import { Card, CardTable } from '@pingcap-incubator/dashboard_components'

// FIXME: The following logic should be extracted into a common component.
function getTreeData(topologyMap) {
  const treeDataByKind = {
    tidb: [],
    tikv: [],
    pd: [],
  }
  Object.values(topologyMap).forEach((target) => {
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
    .filter((kind) => treeDataByKind[kind].length > 0)
    .map((kind) => ({
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
  const res = await client.getInstance().topologyAllGet()
  const map = {}
  res.data.tidb.nodes.forEach((node) => {
    const display = `${node.ip}:${node.port}`
    const target = {
      kind: 'tidb',
      display_name: display,
      ip: node.ip,
      port: node.status_port,
    }
    map[display] = target
  })
  res.data.tikv.nodes.forEach((node) => {
    const display = `${node.ip}:${node.port}`
    const target = {
      kind: 'tikv',
      display_name: display,
      ip: node.ip,
      port: node.status_port,
    }
    map[display] = target
  })
  res.data.pd.nodes.forEach((node) => {
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
  const [historyTable, setHistoryTable] = useState([])

  // FIXME: Use Antd form
  const [selectedTargets, setSelectedTargets] = useState([])
  const [duration, setDuration] = useState(defaultProfilingDuration)

  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const { t } = useTranslation()
  const history = useHistory()

  useEffect(() => {
    async function fetchTargetsMap() {
      setTargetsMap(await getTargetsMapAsync())
    }
    async function fetchHistory() {
      setListLoading(true)
      try {
        const res = await client.getInstance().getProfilingGroups()
        setHistoryTable(res.data)
      } catch (e) {}
      setListLoading(false)
    }
    fetchTargetsMap()
    fetchHistory()
  }, [])

  async function handleStart() {
    if (selectedTargets.length === 0) {
      // TODO: Show notification
      return
    }
    setSubmitting(true)
    const req = {
      targets: selectedTargets.map((k) => targetsMap[k]),
      duration_secs: duration,
    }
    try {
      const res = await client.getInstance().startProfiling(req)
      history.push(`/instance_profiling/${res.data.id}`)
    } catch (e) {
      // FIXME
      message.error(e.message)
    }
    setSubmitting(false)
  }

  const historyTableColumns = [
    {
      title: t('instance_profiling.list.table.columns.targets'),
      key: 'targets',
      render: (_, rec) => {
        // TODO: Extract to utility function
        const r = []
        if (rec.target_stats.num_tidb_nodes) {
          r.push(`${rec.target_stats.num_tidb_nodes} TiDB`)
        }
        if (rec.target_stats.num_tikv_nodes) {
          r.push(`${rec.target_stats.num_tikv_nodes} TiKV`)
        }
        if (rec.target_stats.num_pd_nodes) {
          r.push(`${rec.target_stats.num_pd_nodes} PD`)
        }
        return <span>{r.join(', ')}</span>
      },
    },
    {
      title: t('instance_profiling.list.table.columns.start_at'),
      key: 'started_at',
      render: (_, rec) => {
        return <DateTime.Calendar unixTimeStampMs={rec.started_at * 1000} />
      },
    },
    {
      title: t('instance_profiling.list.table.columns.duration'),
      key: 'duration',
      dataIndex: 'profile_duration_secs',
      width: 150,
    },
    {
      title: t('instance_profiling.list.table.columns.status'),
      key: 'status',
      render: (_, rec) => {
        if (rec.state === 1) {
          return (
            <Badge
              status="processing"
              text={t('instance_profiling.list.table.status.running')}
            />
          )
        } else if (rec.state === 2) {
          return (
            <Badge
              status="success"
              text={t('instance_profiling.list.table.status.finished')}
            />
          )
        } else {
          return (
            <Badge
              status="default"
              text={t('instance_profiling.list.table.status.unknown')}
            />
          )
        }
      },
      width: 150,
    },
    {
      title: t('instance_profiling.list.table.columns.action'),
      key: 'action',
      render: (_, rec) => {
        return (
          <Link to={`/instance_profiling/${rec.id}`}>
            {t('instance_profiling.list.table.actions.detail')}
          </Link>
        )
      },
      width: 100,
    },
  ]

  return (
    <div>
      <Card title={t('instance_profiling.list.control_form.title')}>
        <Form layout="inline">
          <Form.Item
            label={t('instance_profiling.list.control_form.nodes.label')}
          >
            <TreeSelect
              value={selectedTargets}
              treeData={getTreeData(targetsMap)}
              placeholder={t(
                'instance_profiling.list.control_form.nodes.placeholder'
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
            label={t('instance_profiling.list.control_form.duration.label')}
          >
            <Select
              value={duration}
              onChange={setDuration}
              style={{ width: 120 }}
            >
              {profilingDurationsSec.map((sec) => (
                <Select.Option value={sec} key={sec}>
                  {sec}s
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleStart} loading={submitting}>
              {t('instance_profiling.list.control_form.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <CardTable
        loading={listLoading}
        columns={historyTableColumns}
        dataSource={historyTable}
        title={t('instance_profiling.list.table.title')}
        rowKey="id"
      />
    </div>
  )
}
