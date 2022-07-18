import React from 'react'

import ReactJson from 'react-json-view'
import { toFixed, getValueFormat } from '@baurine/grafana-value-formats'
import { Tabs, Tooltip } from 'antd'
import { InfoCircleTwoTone } from '@ant-design/icons'

import { addTranslationResource } from '@lib/utils/i18n'
import { useTranslation } from 'react-i18next'

const translations = {
  en: {
    tooltip: {
      duration:
        'The time taken by the parent operator includes the time taken by all children.',
    },
    diagnosis: {
      high_est_error: 'The estimation error is high. Consider checking the health state of the statistics.',
      disk_spill: 'Disk spill is triggered for this operator because the memory quota is exceeded. The execution might be slow. Consider increasing the memory quota if there\'s enough memory.',
      pseudo_est: 'This operator used pseudo statistics and the estimation might be inaccurate. It might be caused by unavailable or outdated statistics. Consider collecting statistics or setting variable tidb_enable_pseudo_for_outdated_stats to OFF.',
      good_filter_on_table_fullscan: 'This Selection filters a high proportion of data. Using an index on this column might achieve better performance. Consider adding an index on this column if there is not one.',
      bad_index_for_index_lookup: 'This IndexLookup read a lot of data from the index side. It might be slow and cause heavy pressure on TiKV. Consider using the optimizer hints to guide the optimizer to choose a better index or not to use index.',
      index_join_build_side_too_large: 'This index join has a large build side. It might be slow and cause heavy pressure on TiKV. Consider using the optimizer hints to guide the optimizer to choose hash join.',
      tikv_huge_table_scan: 'The TiKV read a lot of data. Consider using TiFlash to get better performance if it\'s necessary to read so much data.',
    },
  },
  zh: {
    tooltip: {
      duration: '父算子的耗时包含所有子算子的耗时。',
    },
    diagnosis: {
      high_est_error: 'The estimation error is high. Consider checking the health state of the statistics.',
      disk_spill: 'Disk spill is triggered for this operator because the memory quota is exceeded. The execution might be slow. Consider increasing the memory quota if there\'s enough memory.',
      pseudo_est: 'This operator used pseudo statistics and the estimation might be inaccurate. It might be caused by unavailable or outdated statistics. Consider collecting statistics or setting variable tidb_enable_pseudo_for_outdated_stats to OFF.',
      good_filter_on_table_fullscan: 'This Selection filters a high proportion of data. Using an index on this column might achieve better performance. Consider adding an index on this column if there is not one.',
      bad_index_for_index_lookup: 'This IndexLookup read a lot of data from the index side. It might be slow and cause heavy pressure on TiKV. Consider using the optimizer hints to guide the optimizer to choose a better index or not to use index.',
      index_join_build_side_too_large: 'This index join has a large build side. It might be slow and cause heavy pressure on TiKV. Consider using the optimizer hints to guide the optimizer to choose hash join.',
      tikv_huge_table_scan: 'The TiKV read a lot of data. Consider using TiFlash to get better performance if it\'s necessary to read so much data.',
    },
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      binaryPlan: translations[key],
    },
  })
}

export const DefaultNodeDetail = (nodeDetailProps) => {
  const nodeDatum = nodeDetailProps.data
  const { t } = useTranslation()

  return (
    <Tabs defaultActiveKey="1" type="card" size="middle">
      <Tabs.TabPane tab="General" key="1" style={{ padding: '1rem' }}>
        <p>
          Duration{' '}
          <Tooltip title={t(`component.binaryPlan.tooltip.duration`)}>
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
              <li key={idx} style={{ padding: '1rem 0'}}>{t(`component.binaryPlan.diagnosis.${d}`)}</li>
            ))}
          </ol>
        </Tabs.TabPane>
      )}
    </Tabs>
  )
}
