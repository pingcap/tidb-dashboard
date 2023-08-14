import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimeoutFn } from 'react-use'
import { CheckOutlined, DownloadOutlined } from '@ant-design/icons'
import { addTranslationResource } from '@lib/utils/i18n'
import { downloadTxt } from '@lib/utils/local-download'

import styles from './index.module.less'

export interface ITxtDownloadLinkProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLSpanElement>,
    HTMLSpanElement
  > {
  data?: string
  fileName?: string
}

const translations = {
  en: {
    download: 'Download',
    success: 'Downloaded'
  },
  zh: {
    download: '下载',
    success: '已下载'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      txtDownloadLink: translations[key]
    }
  })
}

function TxtDownloadLink({
  data,
  fileName,
  ...otherProps
}: ITxtDownloadLinkProps) {
  const { t } = useTranslation()
  const [showDownload, setShowDownloaded] = useState(false)

  const reset = useTimeoutFn(() => {
    setShowDownloaded(false)
  }, 1500)[2]

  const handleDownload = () => {
    downloadTxt(data ?? '', fileName ?? 'data.txt')
    setShowDownloaded(true)
    reset()
  }

  return (
    <span {...otherProps}>
      {!showDownload && (
        <a data-e2e={`download_txt`} onClick={handleDownload}>
          {t(`component.txtDownloadLink.download`)} <DownloadOutlined />
        </a>
      )}
      {showDownload && (
        <span className={styles.successTxt} data-e2e="download_success">
          <CheckOutlined /> {t('component.txtDownloadLink.success')}
        </span>
      )}
    </span>
  )
}

export default React.memo(TxtDownloadLink)
