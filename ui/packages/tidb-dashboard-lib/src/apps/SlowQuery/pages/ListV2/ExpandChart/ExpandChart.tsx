import React, { useMemo, useState } from 'react'
import { Col, Modal, Row, Typography } from 'antd'

import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart'
import {
  DisplayOptions,
  SlowQueryScatterChart
} from '../../../components/charts/ScatterChart'
import { genLabels } from '../../Comparison/charts/ComparisonCharts'
import { TimeRange, TimeRangeValue, toTimeRangeValue } from '@lib/components'
import { Selections } from './Selections'
import { Analyzing } from '../Analyzing'

interface ExpandChartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSelection: DisplayOptions
  defaultTimeRange: TimeRange
}

const { Title } = Typography

export const ExpandChart: React.FC<ExpandChartProps> = ({
  open,
  onOpenChange,
  defaultSelection,
  defaultTimeRange
}) => {
  return (
    <Modal
      centered
      destroyOnClose
      visible={open}
      onCancel={() => onOpenChange(false)}
      width="100%"
      bodyStyle={{
        height: '768px',
        padding: '10px'
      }}
      footer={null}
    >
      <ModalContent
        defaultSelection={defaultSelection}
        defaultTimeRange={defaultTimeRange}
      />
    </Modal>
  )
}

interface ModalContentProps {
  defaultSelection: DisplayOptions
  defaultTimeRange: TimeRange
}
// reset the default value after modal destroy
const ModalContent: React.FC<ModalContentProps> = ({
  defaultSelection,
  defaultTimeRange
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange)
  const [selection, setSelection] = useState<DisplayOptions>(defaultSelection)
  const { groupBy } = selection
  const timeRangeValue: TimeRangeValue = useMemo(
    () => toTimeRangeValue(timeRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeRange.type, timeRange.value.toString()]
  )

  return (
    <>
      <Row style={{ paddingTop: '20px' }}>
        <Selections
          selection={selection}
          onSelectionChange={(v) => setSelection((oldV) => ({ ...oldV, ...v }))}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </Row>

      <Analyzing timeRangeValue={timeRangeValue} rows={5}>
        <Row>
          <Col span={16}>
            <Title level={5}>Slow Query Detail</Title>
            <SlowQueryScatterChart
              timeRangeValue={timeRangeValue}
              displayOptions={selection}
              height={640}
            />
          </Col>
          <Col span={8}>
            <Row>
              <Col span={24}>
                <Title level={5}>Slow Query Count</Title>
                <TimeSeriesChart
                  timeRangeValue={timeRangeValue}
                  height={300}
                  type="line"
                  promql={`count(slow_query_query_time{${genLabels(
                    selection
                  )}}) by (${groupBy})`}
                  name={`{${groupBy!}}`}
                  unit="short"
                />
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Title level={5}>Avg. Slow Query Latency</Title>
                <TimeSeriesChart
                  timeRangeValue={timeRangeValue}
                  height={300}
                  type="line"
                  promql={`sum by (${groupBy}) (rate(slow_query_query_time{${genLabels(
                    selection
                  )}}))`}
                  name={`{${groupBy!}}`}
                  unit="s"
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Analyzing>
    </>
  )
}
