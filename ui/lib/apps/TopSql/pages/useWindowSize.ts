import { useContext, createContext, useState } from 'react'

export const WindowSizeContext = createContext<
  ReturnType<typeof useWindowSizeContext>
>(null as any)

interface WindowSizeOption {
  barWidth: number
}

export function useWindowSizeContext(option: WindowSizeOption) {
  const [windowSize, setWindowSize] = useState<number>(1)
  // chart area px / time range = px per second = bar width / window size
  const computeWindowSize = (screenWidth: number, totalTimeRange: number) => {
    const widthPerSecond = screenWidth / totalTimeRange
    setWindowSize(Math.ceil(option.barWidth / widthPerSecond))
  }

  return { windowSize, computeWindowSize }
}

export function useWindowSize() {
  return useContext(WindowSizeContext)
}
