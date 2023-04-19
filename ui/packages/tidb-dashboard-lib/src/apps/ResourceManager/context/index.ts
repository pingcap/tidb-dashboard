import { createContext, useContext } from 'react'

export interface IResourceManagerDataSource {}

export interface IResourceManagerConfig {}

export interface IResourceManagerContext {
  ds: IResourceManagerDataSource
  cfg: IResourceManagerConfig
}

export const ResourceManagerContext =
  createContext<IResourceManagerContext | null>(null)

export const ResourceManagerProvider = ResourceManagerContext.Provider

export const useResourceManagerContext = () => {
  const ctx = useContext(ResourceManagerContext)
  if (ctx === null) {
    throw new Error('ResourceManagerContext must not be null')
  }
  return ctx
}
