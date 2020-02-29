import React from 'react';
import { Table } from 'antd';
import { useTranslation } from 'react-i18next';

function ComponentPanelTable({ cluster }) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('clusterinfo.component_table.ip'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('clusterinfo.component_table.port'),
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: t('clusterinfo.component_table.status'),
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: t('clusterinfo.component_table.version'),
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('clusterinfo.component_table.deploy_dir'),
      dataIndex: 'deploy_dir',
      key: 'deploy_dir',
    },
    {
      title: t('clusterinfo.component_table.status_port'),
      dataIndex: 'status_port',
      key: 'status_port',
    },
  ];

  let dataSource = [];

  pushNodes('tikv', cluster, dataSource);
  pushNodes('tidb', cluster, dataSource);
  pushNodes('pd', cluster, dataSource);

  return (
    <div>
      {/* TODO: i18n */}
      <h2>Nodes List</h2>
      <Table columns={columns} dataSource={dataSource} pagination={false} />;
    </div>
  );
}

function pushNodes(key, cluster, dataSource) {
  if (
    cluster[key] !== undefined &&
    cluster[key] !== null &&
    cluster[key].err === null
  ) {
    dataSource.push({
      ip: key + '(' + cluster.tidb.nodes.length + ')',
      children: cluster[key].nodes.map((n, index) => wrapnode(n, key, index)),
    });
  }
}

function wrapnode(node, comp, id) {
  if (node === undefined || node === null) {
    return;
  }
  let status = 'down';
  if (node.status === 1) {
    status = 'up';
  }
  if (node.deploy_dir === undefined && node.binary_path !== null) {
    node.deploy_dir = node.binary_path.substring(
      0,
      node.binary_path.lastIndexOf('/')
    );
  }
  return {
    key: comp + '-' + id,
    ip: node.ip,
    port: node.port,
    binary_path: node.binary_path,
    deploy_dir: node.deploy_dir,
    version: node.version,
    status_port: node.status_port,
    status: status,
  };
}

export default ComponentPanelTable;
