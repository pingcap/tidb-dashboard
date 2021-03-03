// Modified from github.com/microsoft/SandDance under the MIT license.

export function downloadData(data: any, fileName: string) {
  const a = document.createElement('a')
  a.setAttribute('download', fileName)
  document.body.appendChild(a)
  const blob = dataURIToBlob(data)
  a.href = URL.createObjectURL(blob)
  a.onclick = () => {
    requestAnimationFrame(() => URL.revokeObjectURL(a.href))
    document.body.removeChild(a)
  }
  a.click()
}

function dataURIToBlob(binStr: string) {
  const len = binStr.length,
    arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i)
  }
  return new Blob([arr])
}
