import * as d3 from 'd3'

export function createBuffer(
  normalizedValues: Uint8Array,
  width: number,
  height: number,
  rasterizedColors: Uint32Array
): HTMLCanvasElement {
  const canvas = d3
    .create('canvas')
    .attr('width', width)
    .attr('height', height)
    .node() as HTMLCanvasElement

  console.time('createBuffer')

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const imageDataBuffer = new ArrayBuffer(width * height * 4)
  const imageDataPixels = new Uint32Array(imageDataBuffer)

  const len = normalizedValues.length
  for (let i = 0; i < len; i++) {
    imageDataPixels[i] = rasterizedColors[normalizedValues[i]]
  }

  const imageData = ctx.createImageData(width, height)
  imageData.data.set(new Uint8ClampedArray(imageDataBuffer))
  ctx.putImageData(imageData, 0, 0)

  console.timeEnd('createBuffer')

  return canvas
}
