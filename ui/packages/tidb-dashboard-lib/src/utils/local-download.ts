export function downloadTxt(data: string, fileName: string) {
  const fileUrl = URL.createObjectURL(
    new Blob([data], {
      type: 'text/plain;charset=utf-8;'
    })
  )
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.href = fileUrl
  a.download = fileName
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
  }, 0)
}
