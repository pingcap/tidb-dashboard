// Modified from github.com/microsoft/SandDance under the MIT license.
import { strings } from './language'

export function invalidUrlError(url: string | undefined) {
  if (!url) {
    return strings.errorNoUrl
  }
  if (url.toLocaleLowerCase().substr(0, 4) !== 'http') {
    return strings.errorUrlHttp
  }
}
