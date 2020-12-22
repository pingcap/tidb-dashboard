import { ScaleLinear, scaleLinear } from 'd3'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { IFlameGraph, IFullSpan } from './flameGraph'

import {
  Pos,
  Window,
  TimeRange,
  Action,
  TimeRangeChangeListener,
} from './timelineTypes'
export class TimelineOverviewChart {
  private context: CanvasRenderingContext2D
  private offscreenContext: CanvasRenderingContext2D

  // dimensions
  private width: number = 0
  private height: number = 0
  private dragAreaHeight: number = 0
  private offscreenCanvasHeight: number = 0

  // timeDuration
  private timeDuration: number = 0 // unit?
  private minSelectedTimeDuration: number = 0
  private selectedTimeRange: TimeRange = { start: 0, end: 0 }
  private timeLenScale: ScaleLinear<number, number> = scaleLinear()

  // window
  private curWindow: Window = { left: 0, right: 0 }
  private mouseDownWindow: Window = { left: 0, right: 0 }

  // mouse pos
  private curMousePos: Pos = { x: 0, y: 0 }
  private mouseDownPos: Pos | null = null

  // action
  private action = Action.None

  // draw dimensions and style
  static WINDOW_MIN_WIDTH = 6
  static WINDOW_RESIZE_LINE_WIDTH = 4
  static WINDOW_RESIZE_LINE_WIDTH_HALF =
    TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH / 2
  static WINDOW_RESIZE_STROKE_STYLE = '#ccc'
  static WINDOW_BORDER_STORKE_STYLE = '#d0d0d0'
  static WINDOW_BORDER_ALPHA = 1.0
  static WINDOW_BORDER_WIDTH = 1
  static UNSELECTED_WINDOW_FILL_STYLE = '#f0f0f0'
  static UNSELECTED_WINDOW_ALPHA = 0.6
  static SELECTED_WINDOW_FILL_STYLE = 'cornflowerblue'
  static SELECTED_WINDOW_ALPHA = 0.3
  static MOVED_VERTICAL_LINE_STROKE_STYLE = 'cornflowerblue'
  static MOVED_VERTICAL_LINE_WIDTH = 2

  static OFFSCREEN_CANVAS_LAYER_HEIGHT = 20

  // flameGraph
  private flameGraph: IFlameGraph

  //
  private timeRangeListeners: TimeRangeChangeListener[] = []

  /////////////////////////////////////
  // setup
  constructor(container: HTMLDivElement, flameGraph: IFlameGraph) {
    this.flameGraph = flameGraph

    const canvas = document.createElement('canvas')
    this.context = canvas.getContext('2d')!
    container.append(canvas)

    // offscreen
    const offscreenCanvas = document.createElement('canvas')
    this.offscreenContext = offscreenCanvas.getContext('2d')!

    this.setTimeDuration(flameGraph.rootSpan.duration_ns!)
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()

    this.drawOffscreenCanvas()
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
    this.height = container!.clientHeight
    this.dragAreaHeight = Math.floor(this.height / 5)

    this.offscreenCanvasHeight =
      (this.flameGraph.rootSpan.max_child_depth + 1) *
      TimelineOverviewChart.OFFSCREEN_CANVAS_LAYER_HEIGHT
  }

  fixPixelRatio() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/devicePixelRatio
    const dpr = window.devicePixelRatio || 1

    this.context.canvas.style.width = this.width + 'px'
    this.context.canvas.style.height = this.height + 'px'
    this.context.canvas.width = this.width * dpr
    this.context.canvas.height = this.height * dpr
    this.context.scale(dpr, dpr)

    // offscreen
    // offscreen doesn't need to fix pixel ratio
    this.offscreenContext.canvas.width = this.width
    this.offscreenContext.canvas.height = this.offscreenCanvasHeight
  }

  // call it when timeDuration or width change
  setTimeLenScale() {
    this.timeLenScale = scaleLinear()
      .domain([0, this.timeDuration])
      .range([0, this.width])

    // update window
    const window = this.timeRangeToWindow(this.selectedTimeRange)
    if (window.right - window.left >= TimelineOverviewChart.WINDOW_MIN_WIDTH) {
      this.curWindow = window
    }
  }

  /////////////////////////////////////
  //
  setTimeRange(newTimeRange: TimeRange) {
    this.selectedTimeRange = newTimeRange
    // TODO: extract a setWindow() method
    // update window
    const window = this.timeRangeToWindow(this.selectedTimeRange)
    if (window.right - window.left >= TimelineOverviewChart.WINDOW_MIN_WIDTH) {
      this.curWindow = window
    }
    this.draw()
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
    this.drawOffscreenCanvas()
    this.draw()
  }

  // save initial pos and window
  onMouseDown = (event) => {
    event.preventDefault() // prevent selection

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.mouseDownPos = loc
    this.mouseDownWindow = { ...this.curWindow }
  }

  // recover mouse cursor
  onCanvasMouseOut = (event) => {
    event.preventDefault()

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc
    this.draw()
  }

  // save action type
  onCanvasMouseMove = (event) => {
    event.preventDefault()

    // when mouse is down, the event will propagate to window
    if (this.mouseDownPos) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc
    this.draw()
  }

  // handle kinds of action
  onWindowMouseMove = (event) => {
    event.preventDefault()

    // only response when mouse is down
    if (this.mouseDownPos === null) return

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateWindow(loc)
    this.curMousePos = loc
    this.draw()
  }

  // update action type and window both
  onMouseUp = (event) => {
    event.preventDefault()

    const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
    this.updateAction(loc)
    this.curMousePos = loc

    // update window
    if (this.action === Action.SelectWindow && this.mouseDownPos) {
      let { x } = loc
      if (x < 0) x = 0
      if (x > this.width) x = this.width
      let newLeft = Math.min(this.mouseDownPos.x, x)
      let newRight = Math.max(this.mouseDownPos.x, x)
      if (newRight - newLeft < 2 * TimelineOverviewChart.WINDOW_MIN_WIDTH) {
        newLeft = Math.max(0, newLeft - TimelineOverviewChart.WINDOW_MIN_WIDTH)
        newRight = Math.min(
          this.width,
          newRight + TimelineOverviewChart.WINDOW_MIN_WIDTH
        )
      }
      this.curWindow = { left: newLeft, right: newRight }
      this.selectedTimeRange = this.windowToTimeRange(this.curWindow)
      this.notifyTimeRangeListeners(this.selectedTimeRange)
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
    this.selectedTimeRange = { start: newStart, end: newEnd }
    this.notifyTimeRangeListeners(this.selectedTimeRange)

    // update window
    const window = this.timeRangeToWindow(this.selectedTimeRange)
    if (window.right - window.left >= TimelineOverviewChart.WINDOW_MIN_WIDTH) {
      this.curWindow = window
    }

    this.draw()
  }

  updateAction(loc: Pos) {
    // only change it when mouse isn't down
    if (this.mouseDownPos) return

    const { left, right } = this.curWindow
    if (this.mouseOutsideCanvas(loc)) {
      this.action = Action.None
    } else if (loc.y > this.dragAreaHeight) {
      this.action = Action.SelectWindow
    } else if (
      loc.x > left - TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH_HALF &&
      loc.x < left + TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH_HALF
    ) {
      this.action = Action.MoveWindowLeft
    } else if (
      loc.x > right - TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH_HALF &&
      loc.x < right + TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH_HALF
    ) {
      this.action = Action.MoveWindowRight
    } else {
      this.action = Action.MoveWindow
    }
    this.updateCursor()
  }

  updateCursor() {
    // https://developer.mozilla.org/zh-CN/docs/Web/CSS/cursor
    let cursor: string
    switch (this.action) {
      case Action.SelectWindow:
        cursor = 'text'
        break
      case Action.MoveWindowLeft:
      case Action.MoveWindowRight:
        cursor = 'ew-resize'
        break
      case Action.MoveWindow:
        cursor = 'grab'
        break
      default:
        cursor = 'initial'
        break
    }
    document.body.style.cursor = cursor
  }

  updateWindow(loc: Pos) {
    const { left, right } = this.curWindow
    let newLeft: number = left
    let newRight: number = right
    if (this.action === Action.MoveWindowLeft) {
      if (loc.x < 0) {
        newLeft = 0
      } else if (loc.x > right - TimelineOverviewChart.WINDOW_MIN_WIDTH) {
        newLeft = right - TimelineOverviewChart.WINDOW_MIN_WIDTH
      } else {
        newLeft = loc.x
      }
    } else if (this.action === Action.MoveWindowRight) {
      if (loc.x > this.width) {
        newRight = this.width
      } else if (loc.x < left + TimelineOverviewChart.WINDOW_MIN_WIDTH) {
        newRight = left + TimelineOverviewChart.WINDOW_MIN_WIDTH
      } else {
        newRight = loc.x
      }
    } else if (this.action === Action.MoveWindow) {
      let delta = loc.x - this.mouseDownPos!.x
      const { left, right } = this.mouseDownWindow
      if (delta < -left) {
        delta = -left
      } else if (delta > this.width - right) {
        delta = this.width - right
      }
      newLeft = left + delta
      newRight = right + delta
    }

    // if (this.mouseDownPos !== null) {
    if (newLeft !== left || newRight !== right) {
      this.curWindow = { left: newLeft, right: newRight }
      this.selectedTimeRange = this.windowToTimeRange(this.curWindow)
      this.notifyTimeRangeListeners(this.selectedTimeRange)
    }
  }

  /////////////////////////////////////
  // draw
  draw() {
    this.context.clearRect(0, 0, this.width, this.height)
    this.drawTimePointsAndVerticalLines()
    this.drawFlameGraph()
    this.drawWindow()
    this.drawMoveVerticalLine()
    this.drawSelectedWindow()
  }

  drawTimePointsAndVerticalLines() {
    this.context.save()
    // text
    this.context.textAlign = 'end'
    this.context.textBaseline = 'top'
    // vertical lines
    this.context.strokeStyle = '#ccc'
    this.context.lineWidth = 0.5

    let timeDelta = this.calcXAxisTimeDelta()
    let i = 0
    while (true) {
      i++
      const x = Math.round(this.timeLenScale(timeDelta * i))
      if (x > this.width) {
        break
      }
      // text
      const timeStr = getValueFormat('ns')(timeDelta * i, 0)
      this.context.fillText(timeStr, x - 2, 2)
      // vertical line
      this.context.beginPath()
      this.context.moveTo(x + 0.5, 0)
      this.context.lineTo(x + 0.5, this.height)
      this.context.stroke()
    }
    this.context.restore()
  }

  drawWindow() {
    const { left, right } = this.curWindow

    this.context.save()

    // draw unselected window area
    this.context.globalAlpha = TimelineOverviewChart.UNSELECTED_WINDOW_ALPHA
    this.context.fillStyle = TimelineOverviewChart.UNSELECTED_WINDOW_FILL_STYLE
    this.context.fillRect(0, 0, left, this.height)
    this.context.fillRect(right, 0, this.width, this.height)

    // draw window left and right borders
    this.context.globalAlpha = TimelineOverviewChart.WINDOW_BORDER_ALPHA
    this.context.strokeStyle = TimelineOverviewChart.WINDOW_BORDER_STORKE_STYLE
    this.context.lineWidth = TimelineOverviewChart.WINDOW_BORDER_WIDTH
    this.context.beginPath()
    this.context.moveTo(left, 0)
    this.context.lineTo(left, this.height)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(right, 0)
    this.context.lineTo(right, this.height)
    this.context.stroke()

    // draw resize area
    this.context.strokeStyle = TimelineOverviewChart.WINDOW_RESIZE_STROKE_STYLE
    this.context.lineWidth = TimelineOverviewChart.WINDOW_RESIZE_LINE_WIDTH
    this.context.beginPath()
    this.context.moveTo(left, 0)
    this.context.lineTo(left, this.dragAreaHeight)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(right, 0)
    this.context.lineTo(right, this.dragAreaHeight)
    this.context.stroke()

    this.context.restore()
  }

  drawMoveVerticalLine() {
    // not draw it when mouse move outside the canvas
    // to keep same as the chrome dev tool
    if (
      this.action !== Action.SelectWindow ||
      this.mouseOutsideCanvas(this.curMousePos)
    ) {
      return
    }

    this.context.save()
    this.context.strokeStyle =
      TimelineOverviewChart.MOVED_VERTICAL_LINE_STROKE_STYLE
    this.context.lineWidth = TimelineOverviewChart.MOVED_VERTICAL_LINE_WIDTH
    this.context.beginPath()
    this.context.moveTo(this.curMousePos.x, 0)
    this.context.lineTo(this.curMousePos.x, this.height)
    this.context.stroke()
    this.context.restore()
  }

  drawSelectedWindow() {
    if (this.mouseDownPos === null || this.action !== Action.SelectWindow) {
      return
    }

    this.context.save()
    this.context.globalAlpha = TimelineOverviewChart.SELECTED_WINDOW_ALPHA
    this.context.fillStyle = TimelineOverviewChart.SELECTED_WINDOW_FILL_STYLE
    if (this.curMousePos.x > this.mouseDownPos.x) {
      this.context.fillRect(
        this.mouseDownPos.x,
        0,
        this.curMousePos.x - this.mouseDownPos.x,
        this.height
      )
    } else {
      this.context.fillRect(
        this.curMousePos.x,
        0,
        this.mouseDownPos.x - this.curMousePos.x,
        this.height
      )
    }
    this.context.restore()
  }

  drawFlameGraph() {
    // copy from offscreen
    this.context.save()
    this.context.drawImage(
      this.offscreenContext.canvas,
      0,
      0,
      this.width,
      this.offscreenCanvasHeight,
      0,
      16,
      this.width,
      this.height - 16
    )
    this.context.restore()
  }

  //////////////
  // offscreen canvas

  drawOffscreenCanvas() {
    this.offscreenContext.save()
    this.drawSpan(this.flameGraph.rootSpan, this.offscreenContext)
    this.offscreenContext.restore()
  }

  drawSpan(span: IFullSpan, ctx: CanvasRenderingContext2D) {
    if (span.node_type === 'TiDB') {
      ctx.fillStyle = '#aab254'
    } else {
      ctx.fillStyle = '#507359'
    }
    const x = this.timeLenScale(span.begin_unix_time_ns!)
    const y = span.depth * TimelineOverviewChart.OFFSCREEN_CANVAS_LAYER_HEIGHT
    let width = Math.max(this.timeLenScale(span.duration_ns!), 0.5)
    const height = TimelineOverviewChart.OFFSCREEN_CANVAS_LAYER_HEIGHT - 1
    ctx.fillRect(x, y, width, height)

    const deltaDepth = span.depth - (span.parent?.depth || 0)
    if (deltaDepth > 1) {
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(
        x,
        y - deltaDepth * TimelineOverviewChart.OFFSCREEN_CANVAS_LAYER_HEIGHT
      )
      ctx.stroke()
    }

    span.children.forEach((s) => this.drawSpan(s, ctx))
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

  windowToTimeRange(window: Window): TimeRange {
    return {
      start: this.timeLenScale.invert(window.left),
      end: this.timeLenScale.invert(window.right),
    }
  }

  timeRangeToWindow(timeRange: TimeRange): Window {
    const { start, end } = timeRange
    return {
      left: this.timeLenScale(start),
      right: this.timeLenScale(end),
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
}
