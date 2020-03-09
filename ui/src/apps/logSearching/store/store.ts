import { LogsearchTaskModel } from '@/utils/dashboard_client/api';
import React from 'react';
import { Component } from '../components/utils';

export interface ServerType {
  ip: string,
  port: number,
  status_port: string,
  server_type: string,
}

type StateType = {
  tasks: LogsearchTaskModel[],
  components: Component[],
}

type ActionType =
  | { type: 'tasks'; payload: LogsearchTaskModel[] }
  | { type: 'components'; payload: Component[] }

type ContextType = {
  store: StateType,
  dispatch: React.Dispatch<ActionType>,
}

export const initialState: StateType = {
  tasks: [],
  components: [],
}

export const reducer = (state: StateType, action: ActionType): StateType => {
  switch (action.type) {
    case 'tasks':
      return {
        ...state,
        tasks: action.payload
      }
    case 'components':
      return {
        ...state,
        components: action.payload
      }
    default:
      return state
  }
}

export const Context = React.createContext<ContextType>({
  store: initialState,
  dispatch: (_: ActionType) => { },
})
