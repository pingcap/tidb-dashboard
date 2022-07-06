import React from 'react'

import ReactJson from 'react-json-view'
import { toFixed } from '@baurine/grafana-value-formats'
import { Collapse, List } from 'antd'

export const DefaultNodeDetail = (nodeDetailProps) => {
  const nodeDatum = nodeDetailProps.data

  return (
    <Collapse ghost defaultActiveKey={['1']}>
      <Collapse.Panel
        header="Basic Info"
        key="1"
        style={{ fontWeight: 'bold' }}
      >
        <div style={{ paddingLeft: 24, fontWeight: 'normal' }}>
          {/* <ReactJson
                  src={nodeDatum}
                  enableClipboard={false}
                  displayObjectSize={false}
                  name={false}
                  iconStyle="circle"

                /> */}
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
            Operator Info: <blockquote>{nodeDatum.operatorInfo}</blockquote>
          </p>
          {}
          <div>
            Root Basic Exec Info:{' '}
            <span>
              <ReactJson
                src={nodeDatum.rootBasicExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                name={false}
                iconStyle="circle"
              />
            </span>
          </div>
          <div>
            Root Group Exec Info:{' '}
            <span>
              <ReactJson
                src={nodeDatum.rootGroupExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                name={false}
                iconStyle="circle"
              />
            </span>
          </div>
          <div>
            Coprocessor Exec Info:{' '}
            <span>
              <ReactJson
                src={nodeDatum.copExecInfo}
                enableClipboard={false}
                displayObjectSize={false}
                name={false}
                iconStyle="circle"
              />
            </span>
          </div>
        </div>
      </Collapse.Panel>
      <Collapse.Panel header="Advisor" key="2" style={{ fontWeight: 'bold' }}>
        <div style={{ paddingLeft: 24, fontWeight: 'normal' }}>
          {nodeDatum.diagnosis.length > 0 ? (
            <>
              {/* {nodeDatum.diagnosis.map(() => ( */}
              <List
                itemLayout="horizontal"
                dataSource={nodeDatum.diagnosis}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title="Suggestions" />
                  </List.Item>
                )}
              />
              {/* ))} */}
            </>
          ) : (
            <p>No Advices</p>
          )}
        </div>
      </Collapse.Panel>
    </Collapse>
  )
}
