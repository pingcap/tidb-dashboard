import React from 'react'
import { useTranslation } from 'react-i18next'
import { List } from './components'

export default function ListPage() {
  const { t } = useTranslation()

  return <List />
}
