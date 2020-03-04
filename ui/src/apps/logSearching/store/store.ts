import { LogsearchSearchTarget, LogsearchTaskModel } from '@/utils/dashboard_client/api';
import React from 'react';

export interface ServerType {
  ip: string,
  port: number,
  status_port: string,
  server_type: string,
}

type StateType = {
  tasks: LogsearchTaskModel[],
  topology: Map<string, LogsearchSearchTarget>,
}

type ActionType =
  | { type: 'tasks'; payload: LogsearchTaskModel[] }
  | { type: 'topology'; payload: Map<string, LogsearchSearchTarget> }

type ContextType = {
  store: StateType,
  dispatch: React.Dispatch<ActionType>,
}

export const initialState: StateType = {
  tasks: [],
  topology: new Map(),
}

export const reducer = (state: StateType, action: ActionType): StateType => {
  switch (action.type) {
    case 'tasks':
      return {
        ...state,
        tasks: action.payload
      }
    case 'topology':
      return {
        ...state,
        topology: action.payload
      }
    default:
      return state
  }
}

export const Context = React.createContext<ContextType>({
  store: initialState,
  dispatch: (_: ActionType) => { },
})
