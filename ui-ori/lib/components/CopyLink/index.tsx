import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useTranslation } from 'react-i18next'
import { useTimeoutFn } from 'react-use'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { addTranslationResource } from '@lib/utils/i18n'

import styles from './index.module.less'

type DisplayVariant = 'default' | 'original_sql' | 'formatted_sql'
const transKeys: { [K in DisplayVariant]: string } = {
  default: 'copy',
  original_sql: 'copyOriginal',
  formatted_sql: 'copyFormatted',
}

export interface ICopyLinkProps {
  data?: string
  displayVariant?: DisplayVariant
}

const translations = {
  en: {
    copy: 'Copy',
    copyOriginal: 'Copy Original',
    copyFormatted: 'Copy Formatted',
    success: 'Copied',
  },
  zh: {
    copy: '复制',
    copyOriginal: '复制原始 SQL',
    copyFormatted: '复制格式化 SQL',
    success: '已复制',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      copyLink: translations[key],
    },
  })
}

function CopyLink({ data, displayVariant = 'default' }: ICopyLinkProps) {
  const { t } = useTranslation()
  const [showCopied, setShowCopied] = useState(false)

  const reset = useTimeoutFn(() => {
    setShowCopied(false)
  }, 1500)[2]

  const handleCopy = () => {
    setShowCopied(true)
    reset()
  }

  return (
    <span>
      {!showCopied && (
        <CopyToClipboard text={data ?? ''} onCopy={handleCopy}>
          <a>
            {t(`component.copyLink.${transKeys[displayVariant]}`)}{' '}
            <CopyOutlined />
          </a>
        </CopyToClipboard>
      )}
      {showCopied && (
        <span className={styles.copiedText}>
          <CheckOutlined /> {t('component.copyLink.success')}
        </span>
      )}
    </span>
  )
}

export default React.memo(CopyLink)
