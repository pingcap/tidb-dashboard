import React from 'react'
import { useTranslation } from 'react-i18next'
import { SearchHistory } from './components'

export default function LogSearchingHistory() {
  const { t } = useTranslation()
  return (
    <div>
      <SearchHistory />
    </div>
  )
}
