type Pos = {
  x: number
  y: number
}
type Window = {
  left: number
  right: number
}

enum Action {
  None,
  SelectWindow,
  MoveWindowLeft,
  MoveWindowRight,
  MoveWindow,
}

export class TimelineOverviewChart {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private width: number
  private height: number
  private windowLeft: number
  private windowRight: number
  private mouseDownWindow: Window = { left: 0, right: 0 }
  private mouseDownPos: Pos | null = null
  private curMousePos: Pos = { x: 0, y: 0 }
  private action = Action.None

  constructor(container: HTMLDivElement) {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/devicePixelRatio
    const dpr = window.devicePixelRatio
    this.canvas = document.createElement('canvas')
    this.width = container.clientWidth
    this.height = container.clientHeight
    this.canvas.style.width = container.clientWidth + 'px'
    this.canvas.style.height = container.clientHeight + 'px'
    this.canvas.width = container.clientWidth * dpr
    this.canvas.height = container.clientHeight * dpr
    this.context = this.canvas.getContext('2d')!
    this.context.scale(dpr, dpr)

    this.windowLeft = this.width * 0.3
    this.windowRight = this.width * 0.6

    container.append(this.canvas)
    this.draw()

    this.canvas.addEventListener('mousewheel', (event) => {
      const ev = event as WheelEvent
      // console.log(ev)
      if (ev.deltaY > 0) {
        this.windowLeft -= 10
        this.windowRight += 10
      } else {
        this.windowLeft += 10
        this.windowRight -= 10
      }
      this.draw()
    })
    this.canvas.addEventListener('mousedown', (event) => {
      const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
      this.mouseDownPos = loc
      this.mouseDownWindow = { left: this.windowLeft, right: this.windowRight }
    })
    this.canvas.addEventListener('mouseout', (event) => {
      const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
      this.updateCursor(loc)
      this.curMousePos = loc
      this.draw()
    })
    this.canvas.addEventListener('mousemove', (event) => {
      if (this.mouseDownPos) return

      const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
      this.updateCursor(loc)
      this.curMousePos = loc
      this.draw()
    })
    window.addEventListener('mousemove', (event) => {
      if (this.mouseDownPos === null) return

      const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
      this.updateCursor(loc)
      this.curMousePos = loc

      if (this.action === Action.MoveWindowLeft) {
        this.windowLeft = loc.x
      } else if (this.action === Action.MoveWindowRight) {
        this.windowRight = loc.x
      } else if (this.action === Action.MoveWindow) {
        this.windowLeft =
          this.mouseDownWindow.left + (loc.x - this.mouseDownPos.x)
        this.windowRight =
          this.mouseDownWindow.right + (loc.x - this.mouseDownPos.x)
      }

      this.draw()
    })
    window.addEventListener('mouseup', (event) => {
      const loc = this.windowToCanvasLoc(event.clientX, event.clientY)
      this.updateCursor(loc)
      this.curMousePos = loc

      // set window
      if (this.action === Action.SelectWindow) {
        this.windowLeft = Math.min(this.mouseDownPos!.x, loc.x)
        this.windowRight = Math.max(this.mouseDownPos!.x, loc.x)
      }

      this.mouseDownPos = null
      this.draw()
    })
  }

  updateCursor(loc: Pos) {
    if (this.mouseDownPos) return

    // https://developer.mozilla.org/zh-CN/docs/Web/CSS/cursor

    // outside of canvas
    if (loc.x < 0 || loc.y < 0 || loc.x > this.width || loc.y > this.height) {
      document.body.style.cursor = 'initial'
      this.action = Action.None
      return
    }
    if (loc.y > 20) {
      document.body.style.cursor = 'text'
      this.action = Action.SelectWindow
      return
    }
    if (loc.x > this.windowLeft - 2 && loc.x < this.windowLeft + 2) {
      document.body.style.cursor = 'ew-resize'
      this.action = Action.MoveWindowLeft
      return
    }
    if (loc.x > this.windowRight - 2 && loc.x < this.windowRight + 2) {
      document.body.style.cursor = 'ew-resize'
      this.action = Action.MoveWindowRight
      return
    }
    document.body.style.cursor = 'grab'
    this.action = Action.MoveWindow
  }

  windowToCanvasLoc(windowX: number, windowY: number) {
    const canvasBox = this.canvas.getBoundingClientRect()
    return {
      x: windowX - canvasBox.left,
      y: windowY - canvasBox.top,
    }
  }

  draw() {
    this.context.clearRect(0, 0, this.width, this.height)
    this.drawVerticalLines()
    this.drawTimePoints()
    this.drawWindow()
    this.drawMoveVerticalLine()
    this.drawSelectedWindow()
  }

  drawVerticalLines() {
    this.context.save()
    this.context.strokeStyle = '#ccc'
    this.context.lineWidth = 0.5

    let x = 100
    while (x < this.width) {
      this.context.beginPath()
      this.context.moveTo(x + 0.5, 0)
      this.context.lineTo(x + 0.5, this.height)
      this.context.stroke()
      x += 100
    }

    this.context.restore()
  }

  drawTimePoints() {
    this.context.save()
    this.context.font = '12px sans-serif'
    this.context.textAlign = 'end'
    this.context.textBaseline = 'top'

    let x = 100
    while (x < this.width) {
      this.context.fillText(`${x * 10} ms`, x - 2, 4)
      x += 100
    }

    this.context.restore()
  }

  drawWindow() {
    this.context.save()

    this.context.globalAlpha = 0.6
    this.context.fillStyle = '#f0f0f0'
    // this.context.fillStyle = 'rgba(128,128,128, 0.2)'
    this.context.fillRect(0, 0, this.windowLeft, this.height)
    this.context.fillRect(this.windowRight, 0, this.width, this.height)

    this.context.globalAlpha = 1.0
    // this.context.strokeStyle = 'rgba(128,128,128, 0.5)'
    this.context.strokeStyle = '#d0d0d0'
    this.context.lineWidth = 1
    this.context.beginPath()
    this.context.moveTo(this.windowLeft, 0)
    this.context.lineTo(this.windowLeft, this.height)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(this.windowRight, 0)
    this.context.lineTo(this.windowRight, this.height)
    this.context.stroke()

    //
    this.context.strokeStyle = '#ccc'
    this.context.lineWidth = 4
    this.context.beginPath()
    this.context.moveTo(this.windowLeft, 0)
    this.context.lineTo(this.windowLeft, 20)
    this.context.stroke()
    this.context.beginPath()
    this.context.moveTo(this.windowRight, 0)
    this.context.lineTo(this.windowRight, 20)
    this.context.stroke()

    this.context.restore()
  }

  drawMoveVerticalLine() {
    if (this.action !== Action.SelectWindow) {
      return
    }

    this.context.save()
    this.context.strokeStyle = 'cornflowerblue'
    this.context.lineWidth = 2
    this.context.beginPath()
    this.context.moveTo(this.curMousePos.x, 0)
    this.context.lineTo(this.curMousePos.x, this.height)
    this.context.stroke()
    this.context.restore()
  }

  drawSelectedWindow() {
    if (this.mouseDownPos === null || this.action !== Action.SelectWindow)
      return

    this.context.save()
    this.context.globalAlpha = 0.3
    this.context.fillStyle = 'cornflowerblue'
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

  update() {}
}
