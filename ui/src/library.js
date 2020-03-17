// The entry file used when build as a library.
import i18next from 'i18next'

import AppKeyVis from '@/apps/keyvis'
import metaKeyVis from '@/apps/keyvis/meta'

import AppStatement from '@/apps/statement'
import metaStatement from '@/apps/statement/meta'

import * as i18n from '@/utils/i18n'
import * as client from '@/utils/client'

i18next.on('initialized', () => {
  i18n.addTranslations(metaKeyVis.translations)
  i18n.addTranslations(metaStatement.translations)
})

export default { AppKeyVis, AppStatement, client, i18n }
