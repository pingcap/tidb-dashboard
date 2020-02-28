import React from 'react';
import { Table } from 'antd';

const columns = [
  {
    title: 'IP',
    dataIndex: 'ip',
    key: 'ip',
  },
  {
    title: 'Port',
    dataIndex: 'port',
    key: 'port',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: 'Version',
    dataIndex: 'version',
    key: 'version',
  },
  {
    title: 'Deploy Directory',
    dataIndex: 'deploy_dir',
    key: 'deploy_dir',
  },
  {
    title: 'Status Port',
    dataIndex: 'status_port',
    key: 'status_port',
  },
];

export default class Component_panel extends React.Component {
  render() {
    const data = this.props.data;
    let dataSource = [];

    push_nodes('tikv', data, dataSource);
    push_nodes('tidb', data, dataSource);
    push_nodes('pd', data, dataSource);

    return <Table columns={columns} dataSource={dataSource} />;
  }
}

function push_nodes(key, data, dataSource) {
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
    port: node.port,
    binary_path: node.binary_path,
    deploy_dir: node.deploy_dir,
    version: node.version,
    status_port: node.status_port,
    status: status,
  };
}
