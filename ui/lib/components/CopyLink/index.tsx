import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { addTranslationResource } from '@lib/utils/i18n'
import { useTranslation } from 'react-i18next'
import { useTimeoutFn } from 'react-use'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'

import styles from './index.module.less'

export interface ICopyLinkProps {
  data: string
}

const translations = {
  en: {
    text: 'Copy',
    success: 'Copied',
  },
  'zh-CN': {
    text: '复制',
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

export default function CopyLink({ data }: ICopyLinkProps) {
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
        <CopyToClipboard text={data} onCopy={handleCopy}>
          <a>
            {t('component.copyLink.text')} <CopyOutlined />
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
