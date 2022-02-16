export const test_data = {
  logical: {
    final: [
      {
        id: 1,
        type: 'DataSource',
        children: [],
        cost: 0,
        selected: false,
        property: '',
        info: 'table:t',
      },
      {
        id: 2,
        type: 'Projection',
        children: [1],
        cost: 0,
        selected: false,
        property: '',
        info: 'test.t.id',
      },
    ],
    steps: [
      {
        index: 1,
        before: [
          {
            id: 1,
            type: 'DataSource',
            children: [],
            cost: 0,
            selected: false,
            property: '',
            info: 'table:t',
          },
          {
            id: 2,
            type: 'Projection',
            children: [1],
            cost: 0,
            selected: false,
            property: '',
            info: 'test.t.id',
          },
        ],
        name: 'column_prune',
        steps: [
          {
            action:
              "DataSource_1's columns[test.t._tidb_rowid] have been pruned",
            reason: '',
            id: 1,
            type: 'DataSource',
            index: 0,
          },
        ],
      },
    ],
  },
  physical: {
    final: [
      {
        id: 5,
        type: 'TableReader',
        children: [],
        cost: 34418,
        selected: false,
        property: '',
        info: 'data:TableFullScan_4',
      },
      {
        id: 3,
        type: 'Projection',
        children: [5],
        cost: 40436,
        selected: false,
        property: '',
        info: 'test.t.id',
      },
    ],
    selected_candidates: [
      {
        id: 3,
        type: 'Projection',
        children: null,
        cost: 40436,
        selected: true,
        property:
          'Prop{cols: [], TaskTp: rootTask, expectedCount: 1.7976931348623157e+308}',
        info: 'test.t.id',
        mapping: 'Projection_2',
      },
      {
        id: 5,
        type: 'TableReader',
        children: null,
        cost: 34418,
        selected: true,
        property:
          'Prop{cols: [], TaskTp: rootTask, expectedCount: 1.7976931348623157e+308}',
        info: 'data:TableFullScan_4',
        mapping: 'DataSource_1',
      },
    ],
    discarded_candidates: [],
  },
  final: [
    {
      id: 5,
      type: 'TableReader',
      children: [],
      cost: 34418,
      selected: false,
      property: '',
      info: 'data:TableFullScan_4',
    },
  ],
  isFastPlan: false,
}
