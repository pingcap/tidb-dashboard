import { LogsearchTaskModel } from './../../../utils/dashboard_client/api';
import React from 'react'
import { RangePickerValue } from 'antd/lib/date-picker/interface';

export interface SearchOptions {
  curTimeRange: RangePickerValue
  curLogLevel: number
  curComponents: string[]
  curSearchValue: string
}

type StateType = {
  searchOptions: SearchOptions,
  taskGroupID: string,
  tasks: LogsearchTaskModel[],
}

type ActionType = 
  | { type: 'search_options'; payload: SearchOptions}
  | { type: 'task_group_id'; payload: string}
  | { type: 'tasks'; payload: LogsearchTaskModel[]}

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
  taskGroupID: '',
  tasks: [],
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
    default:
      return state
  }
}

export const Context = React.createContext<ContextType>({
  store: initialState,
  dispatch: (_: ActionType) => {},
})
