import mime from 'mime-types'

export const isJSONContentType = (contentType: string) => {
  return mime.extension(contentType) === mime.extension(mime.lookup('json'))
}

export const isBinaryContentType = (contentType: string) => {
  return mime.extension(contentType) === mime.extension(mime.lookup('bin'))
}

export const download = (
  data: Blob,
  fileName: string,
  ext: string = mime.extension(data.type)
) => {
  const link = document.createElement('a')
  const fileNameWithExt = `${fileName}.${ext}`

  link.href = window.URL.createObjectURL(data)
  link.download = fileNameWithExt
  link.click()
  window.URL.revokeObjectURL(link.href)
}
