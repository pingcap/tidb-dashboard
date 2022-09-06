import React, { useMemo } from 'react'
import ReactJson from 'react-json-view'
import { Tabs, Tooltip, Drawer, DrawerProps } from 'antd'
import { InfoCircleTwoTone } from '@ant-design/icons'
import { RawNodeDatum, Theme } from 'visual-plan'

import { addTranslations } from '@lib/utils/i18n'
import { useTranslation } from 'react-i18next'
import translations from './translations'
import { toFixed, getValueFormat } from '@baurine/grafana-value-formats'

addTranslations(translations)

interface DetailDrawerProps {
  data: RawNodeDatum
  theme?: Theme
}

function getTableName(node: RawNodeDatum): string {
  let tableName = ''
  if (!node?.accessObjects?.length) return ''

  const scanObject = node.accessObjects.find((obj) =>
    Object.keys(obj).includes('scanObject')
  )

  if (scanObject) {
    tableName = scanObject['scanObject']['table']
  }

  return tableName
}

const DetailDrawer: React.FC<DetailDrawerProps & DrawerProps> = ({
  data,
  theme = 'light',
  ...props
}) => {
  const tableName = useMemo(() => getTableName(data), [data])
  const { t } = useTranslation()

  return (
    data && (
      <Drawer
        title={data.name}
        placement="right"
        width={window.innerWidth * 0.3}
        closable={false}
        destroyOnClose={true}
        style={{ position: 'absolute' }}
        className={theme}
        key="right"
        getContainer={false}
        {...props}
      >
        <Tabs
          defaultActiveKey="1"
          type="card"
          size="middle"
          popupClassName={theme}
        >
          <Tabs.TabPane
            tab={t(`binary_plan.tabs.general`)}
            key="1"
            style={{ padding: '1rem' }}
          >
            <p>
              Duration{' '}
              <Tooltip title={t(`binary_plan.tooltip.duration`)}>
                <InfoCircleTwoTone style={{ paddingRight: 5 }} />
              </Tooltip>
              : <span>{data.duration} </span>
            </p>

            <p>
              Actual Rows: <span>{data.actRows}</span>
            </p>
            <p>
              Estimate Rows: <span>{toFixed(data.estRows, 0)}</span>
            </p>
            <p>
              Run at: <span>{data.storeType}</span>
            </p>
            {tableName && (
              <p className="content">
                Table: <span>{tableName}</span>
              </p>
            )}
            {data.cost && (
              <p>
                Cost: <span>{data.cost}</span>
              </p>
            )}
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={t(`binary_plan.tabs.hardware_usage`)}
            key="2"
            style={{ padding: '1rem' }}
          >
            <p>
              Disk:{' '}
              <span>
                {Number(data.diskBytes)
                  ? getValueFormat('deckbytes')(Number(data.diskBytes), 2, null)
                  : data.diskBytes}{' '}
              </span>
            </p>
            <p>
              Memory:{' '}
              <span>
                {Number(data.memoryBytes)
                  ? getValueFormat('deckbytes')(
                      Number(data.memoryBytes),
                      2,
                      null
                    )
                  : data.memoryBytes}{' '}
              </span>
            </p>
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={t(`binary_plan.tabs.advanced_info`)}
            key="3"
            style={{ padding: '1rem' }}
          >
            <p>
              Task Type: <span>{data.taskType}</span>
            </p>
            {data.labels.length > 0 && (
              <p>
                Labels:{' '}
                <span>
                  {data.labels.map((label, idx) => (
                    <>
                      {idx > 0 ? ',' : ''}
                      {label}
                    </>
                  ))}
                </span>
              </p>
            )}
            {data.operatorInfo && (
              <p>
                Operator Info: <span>{data.operatorInfo}</span>
              </p>
            )}
            {Object.keys(data.rootBasicExecInfo).length > 0 && (
              <div>
                Root Basic Exec Info:{' '}
                <ReactJson
                  src={data.rootBasicExecInfo}
                  enableClipboard={false}
                  displayObjectSize={false}
                  displayDataTypes={false}
                  name={false}
                  theme={theme === 'dark' ? 'monokai' : 'rjv-default'}
                  iconStyle="circle"
                />
              </div>
            )}
            {data.rootGroupExecInfo.length > 0 && (
              <div>
                Root Group Exec Info:{' '}
                <ReactJson
                  src={data.rootGroupExecInfo}
                  enableClipboard={false}
                  displayObjectSize={false}
                  displayDataTypes={false}
                  theme={theme === 'dark' ? 'monokai' : 'rjv-default'}
                  name={false}
                  iconStyle="circle"
                />
              </div>
            )}
            {Object.keys(data.copExecInfo).length > 0 && (
              <div>
                Coprocessor Exec Info:{' '}
                <ReactJson
                  src={data.copExecInfo}
                  enableClipboard={false}
                  displayObjectSize={false}
                  displayDataTypes={false}
                  theme={theme === 'dark' ? 'monokai' : 'rjv-default'}
                  name={false}
                  iconStyle="circle"
                />
              </div>
            )}
            {data.accessObjects.length > 0 && (
              <div>
                Access Object:
                <>
                  {data.accessObjects.map((obj, idx) => (
                    <ReactJson
                      key={idx}
                      src={obj}
                      enableClipboard={false}
                      displayObjectSize={false}
                      displayDataTypes={false}
                      theme={theme === 'dark' ? 'monokai' : 'rjv-default'}
                      name={false}
                      iconStyle="circle"
                    />
                  ))}
                </>
              </div>
            )}
          </Tabs.TabPane>
          {data.diagnosis.length > 0 && (
            <Tabs.TabPane tab={t(`binary_plan.tabs.diagnosis`)} key="4">
              <ol type="1">
                {data.diagnosis.map((d: string, idx) => (
                  <li key={idx} style={{ padding: '1rem 0' }}>
                    {t(`binary_plan.diagnosis.${d}`)}
                  </li>
                ))}
              </ol>
            </Tabs.TabPane>
          )}
        </Tabs>
      </Drawer>
    )
  )
}

export default DetailDrawer
