import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form, Modal, Radio, Select } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { DatePicker } from '@lib/components'
import { SlowQueryContext } from '../../context'
import dayjs, { Dayjs } from 'dayjs'

const hoursRange = [...Array(24).keys()]

function DownloadDBFileModal({
  visible,
  setVisible
}: {
  visible: boolean
  setVisible: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const ctx = useContext(SlowQueryContext)
  const { t } = useTranslation()

  type RangeType = 'by_day' | 'by_hour'

  const [rangeTypeVal, setRangeTypeVal] = useState<RangeType>('by_day')
  const [downloading, setDownloading] = useState(false)

  const [dateVal, setDateVal] = useState<dayjs.Dayjs | null>(null)
  const [hourVal, setHourVal] = useState(0)

  const downloadDBFile = useMemoizedFn(
    async (dateVal: Dayjs, hourVal: number, rangeTypeVal: RangeType) => {
      // use last effective query options
      if (hourVal < 0 || hourVal > 23) {
        console.log(`Illegegal hour value: ${hourVal}`)
        hourVal = hourVal % 24
      }
      try {
        setDownloading(true)
        const offset = rangeTypeVal === 'by_day' ? 86400 : 3600
        const dateAlignedUnix = dateVal.unix() - (dateVal.unix() % 86400)
        const begin_time =
          dateAlignedUnix + (rangeTypeVal === 'by_hour' ? hourVal * 3600 : 0)
        const res = await ctx!.ds.slowQueryDownloadDBFile!(
          begin_time,
          begin_time + offset
        )
        const { data, headers } = res
        const fileName = `${begin_time}.db`
        const blob = new Blob([data], { type: headers['content-type'] })
        let dom = document.createElement('a')
        let url = window.URL.createObjectURL(blob)
        dom.href = url
        dom.download = decodeURI(fileName)
        dom.style.display = 'none'
        document.body.appendChild(dom)
        dom.click()
        dom.parentNode!.removeChild(dom)
        window.URL.revokeObjectURL(url)
      } finally {
        setDownloading(false)
      }
    }
  )

  return (
    <Modal
      visible={visible}
      footer={null}
      onCancel={(e) => setVisible(false)}
      title={t('slow_query.download_modal.title')}
    >
      <Form>
        <Form.Item label="Timezone" name="timezone">
          UTC
        </Form.Item>
        <Form.Item label="Range Type" name="layout">
          <Radio.Group
            onChange={(e) => setRangeTypeVal(e.target.value)}
            defaultValue={rangeTypeVal}
          >
            <Radio value={'by_day'}>
              {t('slow_query.download_modal.download_by_day')}
            </Radio>
            <Radio value={'by_hour'}>
              {t('slow_query.download_modal.download_by_hour')}
            </Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Date" name="date">
          <DatePicker
            onChange={(date) => {
              date && setDateVal(date)
            }}
          />
        </Form.Item>
        <Form.Item label="Hour" name="hour">
          <Select
            defaultValue={0}
            disabled={rangeTypeVal === 'by_day'}
            onChange={(val) => setHourVal(val)}
            options={hoursRange.map((i) => {
              return {
                key: i,
                value: i,
                label: `${i}:00~${(i + 1) % 24}:00`
              }
            })}
          />
        </Form.Item>
        <Form.Item label="Download Range" name="download_range">
          {dateVal &&
            `${dateVal.format('YYYY-MM-DD')} ${
              rangeTypeVal === 'by_day'
                ? `00:00 ~ 24:00`
                : `${hourVal}:00~${hourVal + 1}:00`
            } (UTC)`}
        </Form.Item>
        <Form.Item>
          <Button
            disabled={downloading}
            onClick={() =>
              dateVal && downloadDBFile(dateVal, hourVal, rangeTypeVal)
            }
          >
            {t(`slow_query.download_modal.download`)}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default DownloadDBFileModal
