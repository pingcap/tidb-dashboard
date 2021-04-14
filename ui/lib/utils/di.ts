import { createContext } from 'react'

export const useToken = <T>(fn: (...args: any[]) => T, initialValue?: T) =>
  createContext(initialValue as T)
