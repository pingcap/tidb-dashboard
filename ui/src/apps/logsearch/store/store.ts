import { RangePickerValue } from 'antd/lib/date-picker/interface';
import React from 'react';
import { LogsearchTaskModel } from '@/utils/dashboard_client/api';

const mocktopologyData = {
  "alert_manager": {
    "binary_path": "/home/pingcap/mapleFU/data",
    "ip": "172.16.5.34",
    "port": 9093
  },
  "grafana": {
    "binary_path": "/home/pingcap/mapleFU/data",
    "ip": "172.16.5.34",
    "port": 3000
  },
  "pd": [
    {
      "binary_path": "/Users/fuasahi/pingcap/pd/bin",
      "ip": "192.168.1.8",
      "port": 2379,
      "server_status": 0,
      "version": "v4.0.0-beta-28-g6556145a"
    }
  ],
  "tidb": [
    {
      "binary_path": "/Users/fuasahi/pingcap/tidb/bin/tidb-server",
      "git_hash": "7b1c23cefafd1cc9bf6f8bf0e091e6b4faa5d0b6",
      "ip": "192.168.1.8",
      "port": 4000,
      "server_status": 0,
      "status_port": 10080,
      "version": "5.7.25-TiDB-v4.0.0-beta-217-g7b1c23cef"
    }
  ],
  "tikv": [
    {
      "binary_path": "/Users/fuasahi/pingcap/tikv/target/debug/tikv-server",
      "git_hash": "Unknown git hash",
      "ip": "192.168.1.8",
      "labels": {},
      "port": 20160,
      "server_status": 0,
      "status_port": 20180,
      "version": "4.1.0-alpha"
    }
  ]
}

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
  topology: ServerType[],
}

type ActionType =
  | { type: 'search_options'; payload: SearchOptions }
  | { type: 'task_group_id'; payload: number }
  | { type: 'tasks'; payload: LogsearchTaskModel[] }

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
  topology: [],
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
  dispatch: (_: ActionType) => { },
})
