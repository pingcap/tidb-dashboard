import React from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

import styles from './HeaderTabs.module.less'

type HeaderTab = 'history' | 'alert'

function HeaderTabLink({
  active,
  children,
  onClick
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Typography.Link className={active ? styles.active : ''} onClick={onClick}>
      {children}
    </Typography.Link>
  )
}

export default function HeaderTabs({ active }: { active: HeaderTab }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <span className={styles.tabs}>
      <span>{t('materialized_view.header.prefix')}</span>
      <HeaderTabLink
        active={active === 'history'}
        onClick={() => navigate('/materialized_view')}
      >
        {t('materialized_view.header.refresh_history')}
      </HeaderTabLink>
      <span className={styles.divider}>|</span>
      <HeaderTabLink
        active={active === 'alert'}
        onClick={() => navigate('/materialized_view/alert')}
      >
        {t('materialized_view.header.refresh_alert')}
      </HeaderTabLink>
    </span>
  )
}
