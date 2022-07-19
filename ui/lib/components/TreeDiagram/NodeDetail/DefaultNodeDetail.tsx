import React from 'react'

import ReactJson from 'react-json-view'
import { toFixed, getValueFormat } from '@baurine/grafana-value-formats'
import { Tabs, Tooltip } from 'antd'
import { InfoCircleTwoTone } from '@ant-design/icons'

import { addTranslations } from '@lib/utils/i18n'
import { useTranslation } from 'react-i18next'
import translations from '../translations'

addTranslations(translations)

export const DefaultNodeDetail = (nodeDetailProps) => {
  const nodeDatum = nodeDetailProps.data
  const { t } = useTranslation()

  return (
    <Tabs defaultActiveKey="1" type="card" size="middle">
      <Tabs.TabPane tab="General" key="1" style={{ padding: '1rem' }}>
        <p>
          Duration{' '}
          <Tooltip title={t(`binary_plan.tooltip.duration`)}>
            <InfoCircleTwoTone style={{ paddingRight: 5 }} />
          </Tooltip>
          : <span>{nodeDatum.duration} </span>
        </p>

        <p>
          Actual Rows: <span>{nodeDatum.actRows}</span>
        </p>
        <p>
          Estimate Rows: <span>{toFixed(nodeDatum.estRows, 0)}</span>
        </p>
        <p>
          Run at: <span>{nodeDatum.storeType}</span>
        </p>
        {nodeDatum.cost && (
          <p>
            Cost: <span>{toFixed(nodeDatum.cost, 0)}</span>
          </p>
        )}
      </Tabs.TabPane>
      <Tabs.TabPane tab="Hardware Usage" key="2" style={{ padding: '1rem' }}>
        <p>
          Disk:{' '}
          <span>
            {getValueFormat('deckbytes')(nodeDatum.diskBytes, 2, null)}{' '}
          </span>
        </p>
        <p>
          Memory:{' '}
          <span>
            {getValueFormat('deckbytes')(nodeDatum.memoryBytes, 2, null)}{' '}
          </span>
        </p>
      </Tabs.TabPane>
      <Tabs.TabPane
        tab="Advanced Information"
        key="3"
        style={{ padding: '1rem' }}
      >
        <p>
          Task Type: <span>{nodeDatum.taskType}</span>
        </p>
        {nodeDatum.labels.length > 0 && (
          <p>
            Labels:{' '}
            <span>
              {nodeDatum.labels.map((label, idx) => (
                <>
                  {idx > 0 ? ',' : ''}
                  {label}
                </>
              ))}
            </span>
          </p>
        )}
        {nodeDatum.operatorInfo && (
          <p>
            Operator Info: <span>{nodeDatum.operatorInfo}</span>
          </p>
        )}
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
        {nodeDatum.accessObjects.length > 0 && (
          <div>
            Access Object:
            <>
              {nodeDatum.accessObjects.map((obj, idx) => (
                <ReactJson
                  key={idx}
                  src={obj}
                  enableClipboard={false}
                  displayObjectSize={false}
                  displayDataTypes={false}
                  name={false}
                  iconStyle="circle"
                />
              ))}
            </>
          </div>
        )}
      </Tabs.TabPane>
      {nodeDatum.diagnosis.length > 0 && (
        <Tabs.TabPane tab="Diagnose" key="4">
          <ol type="1">
            {nodeDatum.diagnosis.map((d, idx) => (
              <li key={idx} style={{ padding: '1rem 0' }}>
                {t(`binary_plan.diagnosis.${d}`)}
              </li>
            ))}
          </ol>
        </Tabs.TabPane>
      )}
    </Tabs>
  )
}
