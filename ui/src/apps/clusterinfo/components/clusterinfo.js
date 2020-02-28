import React from 'react';
import {Table} from 'antd';

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
    key: 'deploy_dir'
  },
  {
    title: 'Status Port',
    dataIndex: 'status_port',
    key: 'status_port',
  }
];

export default class ClusterInfo extends React.Component {
  render() {
    const data = this.props.data;
    console.log(data);
    let dataSource = [];
    if (data.tikv !== null && data.tikv.err === null) {

      dataSource.push({
        'ip': 'tikv',
        'children': data.tikv.nodes.map((n, index) => wrapnode(n, 'tikv', index)),
      })
    }

    if (data.tidb !== null && data.tidb.err === null) {
      dataSource.push({
        'ip': 'tidb',
        'children': data.tidb.nodes.map((n, index) => wrapnode(n, 'tidb', index)),
      })
    }

    if (data.pd !== null && data.pd.err === null) {
      dataSource.push({
        'ip': 'pd',
        'children': data.tidb.nodes.map((n, index) => wrapnode(n, 'pd', index)),
      })
    }
    console.log(dataSource);

    return (
      <Table columns={columns} dataSource={dataSource} />
    )
  }
}

function wrapnode(node, comp, id) {
  if (node === undefined || node === null) {
    return
  }
  let status = 'down';
  if (node.status === 1) {
    status = 'up';
  }
  return {
    key: comp + "-" + id,
    port: node.port,
    binary_path: node.binary_path,
    deploy_dir: node.deploy_dir,
    version: node.version,
    status_port: node.status_port,
    status: status,
  }
}