import React from 'react';
import { Table } from 'antd';
import { useTranslation } from 'react-i18next';


function ComponentPanelTable(props) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('clusterInfo.componentTable.ip'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('clusterInfo.componentTable.port'),
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: t('clusterInfo.componentTable.status'),
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: t('clusterInfo.componentTable.version'),
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('clusterInfo.componentTable.deploy_dir'),
      dataIndex: 'deploy_dir',
      key: 'deploy_dir',
    },
    {
      title: t('clusterInfo.componentTable.status_port'),
      dataIndex: 'status_port',
      key: 'status_port',
    },
  ];

  const data = props.data;
  let dataSource = [];

  pushNodes('tikv', data, dataSource);
  pushNodes('tidb', data, dataSource);
  pushNodes('pd', data, dataSource);

  return <Table columns={columns} dataSource={dataSource} />;
}

function pushNodes(key, data, dataSource) {
  if (data[key] !== undefined && data[key] !== null && data[key].err === null) {
    dataSource.push({
      ip: key + '(' + data.tidb.nodes.length + ')',
      children: data[key].nodes.map((n, index) => wrapnode(n, key, index)),
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
