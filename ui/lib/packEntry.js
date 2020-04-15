import * as i18n from './utils/i18n'
import AppKeyVizMeta from './apps/KeyViz/index.meta'
import AppStatementMeta from './apps/Statement/index.meta'

export { i18n }
export { default as client } from './client'

i18n.addTranslations(AppKeyVizMeta.translations)
export { default as AppKeyViz } from './apps/KeyViz'

i18n.addTranslations(AppStatementMeta.translations)
export { default as AppStatement } from './apps/Statement'
