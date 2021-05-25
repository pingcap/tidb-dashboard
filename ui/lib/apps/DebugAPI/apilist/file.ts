import mime from 'mime-types'

export const isJSONContentType = (contentType: string) => {
  return mime.extension(contentType) === mime.extension(mime.lookup('json'))
}

export const download = (
  data: string,
  fileName: string,
  contentType: string,
  ext: string = mime.extension(contentType)
) => {
  const blob = new Blob([data], { type: contentType })
  const link = document.createElement('a')
  const fileNameWithExt = `${fileName}.${ext}`

  link.href = window.URL.createObjectURL(blob)
  link.download = fileNameWithExt
  link.click()
  window.URL.revokeObjectURL(link.href)
}
