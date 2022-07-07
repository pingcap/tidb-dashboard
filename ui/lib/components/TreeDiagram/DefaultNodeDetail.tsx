import React from 'react'

import ReactJson from 'react-json-view'
import { toFixed } from '@baurine/grafana-value-formats'
import { Collapse } from 'antd'

import styles from './DefaultNodeDetail.module.less'

export const DefaultNodeDetail = (nodeDetailProps) => {
  const nodeDatum = nodeDetailProps.data

  console.log('nodeDatum', nodeDatum)

  return (
    <Collapse ghost defaultActiveKey={['1']}>
      <Collapse.Panel
        header="Basic Info"
        key="1"
        className={styles.collapseHeader}
      >
        <div style={{ paddingLeft: 24 }} className={styles.BasicInfo}>
          <p>
            Actual Rows: <span>{nodeDatum.actRows}</span>
          </p>
          <p>
            Estimate Rows: <span>{toFixed(nodeDatum.estRows, 2)}</span>
          </p>
          <p>
            Run at: <span>{nodeDatum.storeType}</span>
          </p>
          <p>
            Duration: <span>{nodeDatum.duration}</span>
          </p>
          <p>
            Cost: <span>{toFixed(nodeDatum.cost, 5)}</span>
          </p>
          <p>
            Disk Bytes: <span>{nodeDatum.diskBytes}</span>
          </p>
          <p>
            Memory Bytes: <span>{nodeDatum.memoryBytes}</span>
          </p>
          <p>
            Task Type: <span>{nodeDatum.taskType}</span>
          </p>
          <p>
            Operator Info: <span>{nodeDatum.operatorInfo}</span>
          </p>
          {Object.keys(nodeDatum.rootBasicExecInfo).length > 0 && (
            <div>
              Root Basic Exec Info:{' '}
              <ReactJson
                src={nodeDatum.rootBasicExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                displayDataTypes={false}
                name={false}
                iconStyle="circle"
              />
            </div>
          )}
          {nodeDatum.rootGroupExecInfo.length > 0 && (
            <div>
              Root Group Exec Info:{' '}
              <ReactJson
                src={nodeDatum.rootGroupExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                displayDataTypes={false}
                name={false}
                iconStyle="circle"
              />
            </div>
          )}
          {Object.keys(nodeDatum.copExecInfo).length > 0 && (
            <div>
              Coprocessor Exec Info:{' '}
              <ReactJson
                src={nodeDatum.copExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                displayDataTypes={false}
                name={false}
                iconStyle="circle"
              />
            </div>
          )}
        </div>
      </Collapse.Panel>
      {nodeDatum.diagnosis.length > 0 && (
        <Collapse.Panel header="Advisor" key="2" style={{ fontWeight: 'bold' }}>
          <div style={{ fontWeight: 'normal' }}>
            <ol type="1">
              {nodeDatum.diagnosis.map((d, idx) => (
                <li>{d}</li>
              ))}
            </ol>
          </div>
        </Collapse.Panel>
      )}
    </Collapse>
  )
}
