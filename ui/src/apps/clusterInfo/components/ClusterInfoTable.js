import React from 'react'
import { Table } from 'antd'
import { useTranslation } from 'react-i18next'

const TableWidth = 120

function ComponentPanelTable({ cluster }) {
  const { t } = useTranslation()
  const columns = [
    {
      title: t('cluster_info.component_table.address'),
      dataIndex: 'address',
      key: 'address',
      width: TableWidth
    },
    {
      title: t('cluster_info.component_table.status'),
      dataIndex: 'status',
      key: 'status',
      width: TableWidth
    },
    {
      title: t('cluster_info.component_table.version'),
      dataIndex: 'version',
      key: 'version',
      width: TableWidth
    },
    {
      title: t('cluster_info.component_table.deploy_dir'),
      dataIndex: 'deploy_dir',
      key: 'deploy_dir',
      width: TableWidth
    }
    // {
    //   title: t('cluster_info.component_table.status_port'),
    //   dataIndex: 'status_port',
    //   key: 'status_port',
    // },
  ]

  let dataSource = []

  pushNodes('tikv', cluster, dataSource)
  pushNodes('tidb', cluster, dataSource)
  pushNodes('pd', cluster, dataSource)

  return (
    <div>
      <h3>{t('cluster_info.component_table.node_list')}</h3>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        width={20}
      />
    </div>
  )
}

function pushNodes(key, cluster, dataSource) {
  if (
    cluster[key] !== undefined &&
    cluster[key] !== null &&
    cluster[key].err === null
  ) {
    dataSource.push({
      address: key + '(' + cluster.tidb.nodes.length + ')',
      children: cluster[key].nodes.map((n, index) => wrapNode(n, key, index))
    })
  }
}

function wrapNode(node, comp, id) {
  if (node === undefined || node === null) {
    return
  }
  let status = 'down'
  if (node.status === 1) {
    status = 'up'
  }
  if (node.deploy_dir === undefined && node.binary_path !== null) {
    node.deploy_dir = node.binary_path.substring(
      0,
      node.binary_path.lastIndexOf('/')
    )
  }
  return {
    address: `${node.ip}:${node.port}`,
    binary_path: node.binary_path,
    deploy_dir: node.deploy_dir,
    version: node.version,
    status_port: node.status_port,
    status: status
  }
}

export default ComponentPanelTable
