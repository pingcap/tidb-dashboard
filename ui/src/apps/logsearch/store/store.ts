import { LogsearchSearchTarget, LogsearchTaskModel } from '@/utils/dashboard_client/api';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import React from 'react';

export interface SearchOptions {
  curTimeRange: RangePickerValue
  curLogLevel: number
  curComponents: string[]
  curSearchValue: string
}

export interface ServerType {
  ip: string,
  port: number,
  status_port: string,
  server_type: string,
}

type StateType = {
  searchOptions: SearchOptions,
  taskGroupID: number,
  tasks: LogsearchTaskModel[],
  topology: Map<string, LogsearchSearchTarget>,
}

type ActionType =
  | { type: 'search_options'; payload: SearchOptions }
  | { type: 'task_group_id'; payload: number }
  | { type: 'tasks'; payload: LogsearchTaskModel[] }
  | { type: 'topology'; payload: Map<string, LogsearchSearchTarget> }

type ContextType = {
  store: StateType,
  dispatch: React.Dispatch<ActionType>,
}

export const initialState: StateType = {
  searchOptions: {
    curTimeRange: [null, null],
    curLogLevel: 3,
    curComponents: [],
    curSearchValue: '',
  },
  taskGroupID: -1,
  tasks: [],
  topology: new Map(),
}

export const reducer = (state: StateType, action: ActionType): StateType => {
  switch (action.type) {
    case "search_options":
      return {
        ...state,
        searchOptions: action.payload
      }
    case "task_group_id":
      return {
        ...state,
        taskGroupID: action.payload
      }
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
