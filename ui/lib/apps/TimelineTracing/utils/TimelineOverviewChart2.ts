import * as d3 from 'd3'
import { ScaleLinear } from 'd3'

type Pos = {
  x: number
  y: number
}
type Window = {
  left: number
  right: number
}
type TimeRange = {
  start: number
  end: number
}
enum Action {
  None,
  SelectWindow,
  MoveWindowLeft,
  MoveWindowRight,
  MoveWindow,
}

// utils

export class TimelineOverviewChart {
  private context: CanvasRenderingContext2D

  // dimensions
  private width: number = 0
  private height: number = 0
  private dragAreaHeight: number = 0

  // timeDuration
  private timeDuration: number = 0 // unit?
  private minSelectedTimeDuration: number = 0
  private selectedTimeRange: TimeRange = { start: 0, end: 0 }
  private timeLenScale: ScaleLinear<number, number> = d3.scaleLinear()

  // window
  private curWindow: Window = { left: 0, right: 0 }
  private mouseDownWindow: Window = { left: 0, right: 0 }

  // mouse pos
  private mouseDownPos: Pos | null = null
  private curMousePos: Pos = { x: 0, y: 0 }

  // action
  private action = Action.None

  // draw dimensions and style
  static WINDOW_MIN_WIDTH = 6
  static WINDOW_RESIZE_LINE_WIDTH = 4
  static WINDOW_RESIZE_STROKE_STYLE = '#ccc'
  static WINDOW_BORDER_STORKE_STYLE = '#d0d0d0'
  static WINDOW_BORDER_ALPHA = 1.0
  static WINDOW_BORDER_WIDTH = 1
  static UNSELECTED_WINDOW_FILL_STYLE = '#f0f0f0'
  static UNSELECTED_WINDOW_ALPHA = 0.6

  /////////////////////////////////////
  // setup
  constructor(container: HTMLDivElement, timeDuration: number) {
    const canvas = document.createElement('canvas')
    this.context = canvas.getContext('2d')!
    container.append(canvas)

    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeDuration(timeDuration)
    this.setTimeLenScale()

    this.draw()

    this.registerHanlers()
  }

  setDimensions() {
    const container = this.context.canvas.parentElement
    this.width = container!.clientWidth
    this.height = container!.clientHeight
    this.dragAreaHeight = Math.floor(this.height / 5)
  }

  fixPixelRatio() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/devicePixelRatio
    const dpr = window.devicePixelRatio || 1

    this.context.canvas.style.width = this.width + 'px'
    this.context.canvas.style.height = this.width + 'px'
    this.context.canvas.width = this.width * dpr
    this.context.canvas.height = this.width * dpr

    this.context.scale(dpr, dpr)
  }

  setTimeDuration(timeDuration: number) {
    this.timeDuration = timeDuration
    this.minSelectedTimeDuration = this.timeDuration / 1000
    this.selectedTimeRange = { start: 0, end: timeDuration }
  }

  setTimeLenScale() {
    this.timeLenScale = d3
      .scaleLinear()
      .domain([0, this.timeDuration])
      .range([0, this.width])
    const { start, end } = this.selectedTimeRange
    this.curWindow = {
      left: this.timeLenScale(start),
      right: this.timeLenScale(end),
    }
  }

  /////////////////////////////////////
  // event handlers: mousedown, mousemove, mouseup, mousewheel, resize
  registerHanlers() {
    window.addEventListener('resize', this.onResize)
    this.context.canvas.addEventListener('mousewheel', this.onMouseWheel)
  }
  onMouseDown = () => {}
  onMouseMove = () => {}
  onMouseUp = () => {}

  onMouseWheel = (event) => {
    event.preventDefault()

    const ev = event as WheelEvent
    const { start, end } = this.selectedTimeRange
    const byDelta = (end - start) / 10
    let newStart = start
    let newEnd = end
    if (ev.deltaY > 0) {
      // enlarge
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
      // shrink
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

    const newLeft = this.timeLenScale(newStart)
    const newRight = this.timeLenScale(newEnd)
    if (newRight - newLeft <= TimelineOverviewChart.WINDOW_MIN_WIDTH) {
      // not change this.curWindow
      return
    }
    this.curWindow = { left: newLeft, right: newRight }

    this.draw()
  }
  onResize = () => {
    this.setDimensions()
    this.fixPixelRatio()
    this.setTimeLenScale()
    this.draw()
  }

  /////////////////////////////////////
  // draw
  draw() {
    this.context.clearRect(0, 0, this.width, this.height)
    this.drawTimePointsAndVerticalLines()
    this.drawWindow()
    this.drawMoveVerticalLine()
    this.drawSelectedWindow()
  }

  drawTimePointsAndVerticalLines() {}

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

  drawMoveVerticalLine() {}

  drawSelectedWindow() {}
}
