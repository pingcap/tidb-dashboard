interface Task<T> {
  fn: (...args: any[]) => Promise<T>
  args: any[]
  resolve: (value: T) => void
  reject: (error: Error) => void
}

export class AsyncQueue<T = any> {
  private queue: Task<T>[] = []
  private WIPCounter = 0

  constructor(private concurrent: number) {
    if (concurrent < 1) {
      throw new Error('concurrent must be greater than 0')
    }
  }

  public arrange(
    promiseFn: (...args: any) => Promise<T>,
    ...args: any
  ): Promise<T> {
    let t: Task<T>
    const p = new Promise<T>((resolve, reject) => {
      t = { fn: promiseFn, args, resolve, reject }
    })

    return new Promise((resolve, reject) => {
      this.queue.push(t)
      this.next()
      return p.then(resolve, reject)
    })
  }

  private next() {
    if (this.WIPCounter > this.concurrent || this.queue.length === 0) {
      return
    }

    const task = this.queue.shift()!

    this.WIPCounter++
    task
      .fn(...task.args)
      .then(task.resolve, task.reject)
      .finally(() => {
        this.WIPCounter--
        this.next()
      })
  }
}
