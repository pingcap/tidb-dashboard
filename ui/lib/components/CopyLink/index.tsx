import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useTranslation } from 'react-i18next'
import { useTimeoutFn } from 'react-use'
import { Tooltip } from 'antd'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { addTranslationResource } from '@lib/utils/i18n'

import styles from './index.module.less'

export interface ICopyLinkProps {
  data?: string
  textTransKey?: 'copy' | 'copyOriginal' | 'copyFormatted'
}

const translations = {
  en: {
    copy: 'Copy',
    copyOriginal: 'Copy Original',
    copyFormatted: 'Copy Formatted',
    success: 'Copied',
    tooltip: 'Copy by this button if you need to run it in SQL client',
  },
  zh: {
    copy: '复制',
    copyOriginal: '复制原始 SQL',
    copyFormatted: '复制格式化 SQL',
    success: '已复制',
    tooltip: '如果你需要在 SQL 客户端执行此 SQL 语句，请使用这个按钮进行复制',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      copyLink: translations[key],
    },
  })
}

function CopyLink({ data, textTransKey = 'copy' }: ICopyLinkProps) {
  const { t } = useTranslation()
  const [showCopied, setShowCopied] = useState(false)

  const reset = useTimeoutFn(() => {
    setShowCopied(false)
  }, 1500)[2]

  const handleCopy = () => {
    setShowCopied(true)
    reset()
  }

  const copyBtn = (
    <CopyToClipboard text={data} onCopy={handleCopy}>
      <a>
        {t(`component.copyLink.${textTransKey}`)} <CopyOutlined />
      </a>
    </CopyToClipboard>
  )

  return (
    <span>
      {!showCopied && textTransKey === 'copyOriginal' && (
        <Tooltip title={t('component.copyLink.tooltip')}>{copyBtn}</Tooltip>
      )}
      {!showCopied && textTransKey !== 'copyOriginal' && copyBtn}
      {showCopied && (
        <span className={styles.copiedText}>
          <CheckOutlined /> {t('component.copyLink.success')}
        </span>
      )}
    </span>
  )
}

export default React.memo(CopyLink)
