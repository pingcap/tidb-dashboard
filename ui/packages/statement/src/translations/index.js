// notice: @rollup/plugin-yaml only can be used in .js file, can't use it in .ts file
import en from './en.yaml'
import zh from './zh-CN.yaml'

export const translation = {
  en,
  'zh-CN': zh,
}
