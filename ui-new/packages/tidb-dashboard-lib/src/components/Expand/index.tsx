import React from 'react'
import { useTranslation } from 'react-i18next'
import { addTranslationResource } from '@lib/utils/i18n'

export interface IExpandProps {
  expanded?: boolean
  collapsedContent?: React.ReactNode
  children: React.ReactNode
}

function Expand({ collapsedContent, children, expanded }: IExpandProps) {
  // FIXME: Animations
  return (
    <div data-e2e="statement_query_detail_page_query">
      {expanded ? children : collapsedContent ?? children}
    </div>
  )
}

const translations = {
  en: {
    expandText: 'Expand',
    collapseText: 'Collapse'
  },
  zh: {
    expandText: '展开',
    collapseText: '收起'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      expandLink: translations[key]
    }
  })
}

export interface IExpandLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  expanded?: boolean
}

function Link({ expanded, ...restProps }: IExpandLinkProps) {
  const { t } = useTranslation()
  return (
    <a {...restProps} data-e2e={`${expanded ? 'collapseText' : 'expandText'}`}>
      {expanded
        ? t('component.expandLink.collapseText')
        : t('component.expandLink.expandText')}
    </a>
  )
}

Expand.Link = Link

export default Expand
