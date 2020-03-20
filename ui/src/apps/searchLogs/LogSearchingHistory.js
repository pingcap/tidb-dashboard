import { Head } from "@pingcap-incubator/dashboard_components";
import { Icon } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { SearchHistory } from './components';

export default function LogSearchingHistory() {
  const { t } = useTranslation()

  return (
    <div>
      <Head
        title={t('search_logs.nav.history')}
        back={
          <Link to={`/search_logs`}>
            <Icon type="arrow-left" />{' '}
            {t('search_logs.nav.search_logs')}
          </Link>
        } />
      <SearchHistory />
    </div>
  )
}
