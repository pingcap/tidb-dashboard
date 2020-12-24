import { ScaleLinear, scaleLinear } from 'd3'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { IFlameGraph, IFullSpan } from './flameGraph'
import { Pos, TimeRange, TimeRangeChangeListener } from './timelineTypes'

export type SpanClickListener = (span: IFullSpan | null) => void

export class TimelineDetailChart {
  private context: CanvasRenderingContext2D

  // dimensions
  private width: number = 0
  private height: number = 0

  // timeDuration
  private timeDuration: number = 0 // unit?
  private minSelectedTimeDuration: number = 0
  private timeLenScale: ScaleLinear<number, number> = scaleLinear()

  // time range
  private selectedTimeRange: TimeRange = { start: 0, end: 0 }
  private mouseDownTimeRange: TimeRange = { start: 0, end: 0 }

  // mouse pos
  private mouseDownPos: Pos | null = null

  // draw dimensions and style
  static LAYER_HEIGHT = 20

  // flameGraph
  private flameGraph: IFlameGraph
  private clickedSpan: IFullSpan | null = null
  private hoverSpan: IFullSpan | null = null

  // listeners
  private timeRangeListeners: TimeRangeChangeListener[] = []
  private spanClickListeners: SpanClickListener[] = []

  // tooltip
  private tooltipDomElement: HTMLDivElement | null = null

  /////////////////////////////////////
  // setup
  constructor(container: HTMLDivElement, flameGraph: IFlameGraph) {
    const canvas = document.createElement('canvas')
    this.context = canvas.getContext('2d')!
    container.append(canvas)

    this.flameGraph = flameGraph

    this.setTimeDuration(flameGraph.rootSpan.duration_ns!)
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()

    this.draw()
    this.registerHanlers()
  }

  setTimeDuration(timeDuration: number) {
    this.timeDuration = timeDuration
    this.minSelectedTimeDuration = this.timeDuration / 1000
    this.selectedTimeRange = { start: 0, end: timeDuration }
  }

  setDimensions() {
    const container = this.context.canvas.parentElement
    this.width = container!.clientWidth
    this.height =
      TimelineDetailChart.LAYER_HEIGHT *
      (this.flameGraph.rootSpan.max_child_depth + 1)
  }

  fixPixelRatio() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/devicePixelRatio
    const dpr = window.devicePixelRatio || 1

    this.context.canvas.style.width = this.width + 'px'
    this.context.canvas.style.height = this.height + 'px'
    this.context.canvas.width = this.width * dpr
    this.context.canvas.height = this.height * dpr

    this.context.scale(dpr, dpr)
  }

  // call it when timeDuration or width change
  setTimeLenScale() {
    const { start, end } = this.selectedTimeRange
    this.timeLenScale = scaleLinear()
      .domain([start, end])
      .range([0, this.width])
  }

  /////////////////////////////////////
  //
  setTimeRange(newTimeRange: TimeRange) {
    this.selectedTimeRange = newTimeRange
    this.setTimeLenScale()
    this.draw()
  }

  setTooltipElement(tooltip: HTMLDivElement) {
    this.tooltipDomElement = tooltip
  }

  /////////////////////////////////////
  // event handlers: mousedown, mousemove, mouseup, mousewheel, resize
  registerHanlers() {
    window.addEventListener('resize', this.onResize)
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    this.context.canvas.addEventListener('wheel', this.onMouseWheel)
    this.context.canvas.addEventListener('mousedown', this.onMouseDown)
    this.context.canvas.addEventListener('mousemove', this.onCanvasMouseMove)
    this.context.canvas.addEventListener('mouseout', this.onCanvasMouseOut)
    window.addEventListener('mousemove', this.onWindowMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)
  }

  onResize = () => {
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()
    this.draw()
  }

  // save initial pos and window
  onMouseDown = (event) => {
    event.preventDefault() // prevent selection

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.mouseDownPos = loc
    this.mouseDownTimeRange = this.selectedTimeRange

    // cursor
    document.body.style.cursor = 'grab'

    // tooltip
    this.hoverSpan = null
    this.showTooltip({ x: event.clientX, y: event.clientY })
  }

  // recover mouse cursor
  onCanvasMouseOut = (event) => {
    event.preventDefault()

    this.hoverSpan = null
    this.showTooltip({ x: event.clientX, y: event.clientY })
    this.draw()
  }

  // save action type
  onCanvasMouseMove = (event) => {
    event.preventDefault()

    // when mouse is down, the event will propagate to window
    if (this.mouseDownPos) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.hoverSpan = this.getSpanInPos(this.flameGraph.rootSpan, loc)
    this.showTooltip({ x: event.clientX, y: event.clientY })
    this.draw()
  }

  // handle kinds of action
  onWindowMouseMove = (event) => {
    event.preventDefault()

    // only response when mouse is down
    if (this.mouseDownPos === null) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)

    // drag selected time range
    const { start, end } = this.mouseDownTimeRange
    let newStart: number
    let newEnd: number
    const delteX = loc.x - this.mouseDownPos.x
    if (delteX > 0) {
      // move selected time range to left
      // reduce the start and end
      let deltaTime =
        this.timeLenScale.invert(0) - this.timeLenScale.invert(-delteX)
      // deltaTime > 0
      if (deltaTime > start) {
        deltaTime = start
      }
      newStart = start - deltaTime
      newEnd = end - deltaTime
    } else {
      // move selected time range to right
      // increase the start and end
      let deltaTime =
        this.timeLenScale.invert(-delteX) - this.timeLenScale.invert(0)
      // deltaTime > 0
      const maxDelta = this.timeDuration - end
      if (deltaTime > maxDelta) {
        deltaTime = maxDelta
      }
      newStart = start + deltaTime
      newEnd = end + deltaTime
    }
    const newTimeRange = { start: newStart, end: newEnd }
    this.setTimeRange(newTimeRange)
    this.notifyTimeRangeListeners(newTimeRange)
  }

  // update action type and window both
  onMouseUp = (event) => {
    event.preventDefault()

    // cursor
    document.body.style.cursor = 'initial'

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)

    // handle click
    if (loc.x === this.mouseDownPos?.x && loc.y === this.mouseDownPos?.y) {
      this.clickedSpan = this.getSpanInPos(this.flameGraph.rootSpan, loc)
      this.notifySpanClickListeners(this.clickedSpan)
    }

    // release mouse
    this.mouseDownPos = null
    this.draw()
  }

  onMouseWheel = (event) => {
    event.preventDefault()

    const ev = event as WheelEvent
    const { start, end } = this.selectedTimeRange
    const byDelta = (end - start) / 10
    let newStart = start
    let newEnd = end
    if (ev.deltaY > 0) {
      // enlarge selected window
      newStart = start - byDelta
      let unUsedDelta = 0
      if (newStart < 0) {
        unUsedDelta = -newStart
        newStart = 0
      }
      newEnd = end + byDelta + unUsedDelta
      if (newEnd > this.timeDuration) {
        newEnd = this.timeDuration
      }
    } else {
      // shrink selected window
      if (end - start <= this.minSelectedTimeDuration) {
        // can't shrink more
        return
      }
      newStart = start + byDelta
      newEnd = end - byDelta
      if (newEnd - newStart <= this.minSelectedTimeDuration) {
        newEnd = newStart + this.minSelectedTimeDuration
      }
    }
    const newTimeRange = { start: newStart, end: newEnd }
    this.setTimeRange(newTimeRange)
    this.notifyTimeRangeListeners(newTimeRange)
  }

  /////////////////////////////////////
  // draw
  draw() {
    this.context.clearRect(0, 0, this.width, this.height)
    this.drawFlameGraph()
    this.drawClickedSpan()
  }

  drawFlameGraph() {
    this.context.save()
    this.drawSpan(this.flameGraph.rootSpan)
    this.context.restore()
  }

  drawSpan(span: IFullSpan) {
    const { start, end } = this.selectedTimeRange
    const inside =
      span.relative_end_unix_time_ns > start ||
      span.relative_begin_unix_time_ns < end

    if (inside) {
      if (span === this.hoverSpan) {
        this.context.globalAlpha = 1.0
      } else {
        this.context.globalAlpha = 0.9
      }
      if (span.node_type === 'TiDB') {
        this.context.fillStyle = '#aab254'
      } else {
        this.context.fillStyle = '#507359'
      }
      let x = this.timeLenScale(span.relative_begin_unix_time_ns)
      if (x < 0) {
        x = 0
      }
      const y = span.depth * 20
      let width = Math.max(
        this.timeLenScale(span.relative_end_unix_time_ns) - x,
        0.5
      )
      if (x + width > this.width) {
        width = this.width - x
      }
      const height = 19

      this.context.fillRect(x, y, width, height)

      const deltaDepth = span.depth - (span.parent?.depth || 0)
      if (deltaDepth > 1) {
        this.context.strokeStyle = this.context.fillStyle
        this.context.lineWidth = 0.5
        this.context.beginPath()
        this.context.moveTo(x, y)
        this.context.lineTo(
          x,
          y - deltaDepth * TimelineDetailChart.LAYER_HEIGHT
        )
        this.context.stroke()
      }

      // text
      const durationStr = getValueFormat('ns')(span.duration_ns!, 2)
      const fullStr = `${span.event!} ${durationStr}`
      const fullStrWidth = this.context.measureText(fullStr).width
      const eventStrWidth = this.context.measureText(span.event!).width
      const singleCharWidth = this.context.measureText('n').width
      this.context.textAlign = 'start'
      this.context.textBaseline = 'middle'
      this.context.fillStyle = 'white'
      this.context.globalAlpha = 1.0
      if (width >= fullStrWidth + 4) {
        // show full event and duration

        // full event
        this.context.fillText(span.event!, x + 2, y + 10)

        // duration
        this.context.textAlign = 'end'
        this.context.fillText(durationStr, x + width - 2, y + 10)
      } else if (width >= eventStrWidth + 2) {
        // extract
        this.context.fillText(span.event!, x + 2, y + 10)
      } else {
        // not very accurate
        const charCount = Math.floor((width - 10) / singleCharWidth)
        if (charCount > 1) {
          const str = `${span.event!.slice(0, charCount)}...`
          this.context.fillText(str, x + 2, y + 10)
        }
      }
    }

    span.children.forEach((s) => this.drawSpan(s))
  }

  drawClickedSpan() {
    if (this.clickedSpan === null) return

    if (
      this.clickedSpan.relative_end_unix_time_ns <
        this.selectedTimeRange.start ||
      this.clickedSpan.relative_begin_unix_time_ns > this.selectedTimeRange.end
    ) {
      return
    }

    this.context.save()

    this.context.strokeStyle = '#DC2626'
    this.context.lineWidth = 2

    let x = this.timeLenScale(this.clickedSpan.relative_begin_unix_time_ns)
    if (x < 0) {
      x = 0
    }
    const y = this.clickedSpan.depth * TimelineDetailChart.LAYER_HEIGHT
    let width =
      this.timeLenScale(this.clickedSpan.relative_end_unix_time_ns) - x
    if (width > this.width) {
      width = this.width
    }
    this.context.strokeRect(x, y, width, TimelineDetailChart.LAYER_HEIGHT - 1)

    this.context.restore()
  }

  /////////////////////////////////////////
  //
  showTooltip(windowPos: Pos) {
    if (this.tooltipDomElement === null) return

    if (this.hoverSpan === null) {
      this.tooltipDomElement.style.opacity = '0.0'
    } else {
      this.tooltipDomElement.style.opacity = '1.0'
      this.tooltipDomElement.style.transform = `translate(${
        windowPos.x + 8
      }px, ${windowPos.y + 8}px)`
      this.tooltipDomElement.innerHTML = `<span>${getValueFormat('ns')(
        this.hoverSpan.duration_ns!,
        2
      )}</span>&nbsp;&nbsp;${this.hoverSpan.event!}`
    }
  }

  /////////////////////////////////////////
  // utils
  windowToCanvasLoc(windowX: number, windowY: number) {
    const canvasBox = this.context.canvas.getBoundingClientRect()
    return {
      x: windowX - canvasBox.left,
      y: windowY - canvasBox.top,
    }
  }

  mouseOutsideCanvas(loc: Pos) {
    return loc.x < 0 || loc.y < 0 || loc.x > this.width || loc.y > this.height
  }

  calcXAxisTimeDelta() {
    const defTimeDelta = this.timeLenScale.invert(100) // how long the 100px represents
    // nice the defTimeDelta, for example: 1980ms -> 2000ms
    let timeDelta = defTimeDelta
    let step = 1
    while (timeDelta > 10) {
      timeDelta /= 10
      step *= 10
    }
    // TODO: handle situation when timeDelta < 10
    if (step > 1) {
      timeDelta = Math.round(timeDelta) * step
    }
    return timeDelta
  }

  getSpanInPos(span: IFullSpan, pos: Pos): IFullSpan | null {
    const { x, y } = pos
    const x1 = this.timeLenScale(span.relative_begin_unix_time_ns)
    const x2 = this.timeLenScale(span.relative_end_unix_time_ns)
    const y1 = span.depth * TimelineDetailChart.LAYER_HEIGHT
    const y2 = y1 + TimelineDetailChart.LAYER_HEIGHT - 1
    if (x <= x2 && x >= x1 && y <= y2 && y >= y1) {
      return span
    }
    if (span.children.length === 0) {
      return null
    }

    // traverse children
    for (let i = 0; i < span.children.length; i++) {
      const targetSpan = this.getSpanInPos(span.children[i], pos)
      if (targetSpan) {
        return targetSpan
      }
    }
    return null
  }

  //////////////////////////////////
  // listeners
  addTimeRangeListener(listener: TimeRangeChangeListener) {
    this.timeRangeListeners.push(listener)
    listener(this.selectedTimeRange)
    return () => {
      this.timeRangeListeners = this.timeRangeListeners.filter(
        (l) => l !== listener
      )
    }
  }

  notifyTimeRangeListeners(newTimeRange: TimeRange) {
    this.timeRangeListeners.forEach((l) => l(newTimeRange))
  }

  addSpanClickListener(listener: SpanClickListener) {
    this.spanClickListeners.push(listener)
    listener(this.clickedSpan)
    return () => {
      this.spanClickListeners = this.spanClickListeners.filter(
        (l) => l !== listener
      )
    }
  }

  notifySpanClickListeners(span: IFullSpan | null) {
    this.spanClickListeners.forEach((l) => l(span))
  }
}
