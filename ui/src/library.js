// The entry file used when build as a library

import appKeyVis from '@/apps/keyvis'
import appStatement from '@/apps/statement'
import * as i18n from '@/utils/i18n'
import client from '@/utils/client'

// TODO: Allow customizing client prefix

export { appKeyVis, appStatement, i18n, client }
