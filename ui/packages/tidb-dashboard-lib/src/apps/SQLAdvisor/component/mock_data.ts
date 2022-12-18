export const sqlTunedResultResp = {
  data: {
    sql_tuned_result: [
      {
        id: 1,
        insight_type: 'low_healthy',
        impact: 'Middle',
        sql_statement:
          "select count(*) from advisor_task where  start_time\u003e'******'",
        sql_digest: '',
        plan_digest: '',
        suggested_command: ' analyze table advisor_task;',
        used_index: false,
        used_stats: false,
        table_clauses: null,
        table_healthies: null,
        analyzed_time: '2022-12-04 15:00:00'
      },
      {
        id: 2,
        insight_type: 'missing_indexes',
        impact: 'High',
        sql_statement:
          "select cluster_id, project_id, telnat_id,status ,start_time from advisor_task where cluster_id='\u0026****HGJHKK***' and telnat_id='asssss111' order by cluster_id",
        sql_digest: '',
        plan_digest: '',
        suggested_command: ' analyze table advisor_task;',
        used_index: false,
        used_stats: false,
        table_clauses: null,
        table_healthies: null,
        analyzed_time: '2022-12-04 15:00:00'
      }
    ]
  }
}

export const sqlTunedResultByIDResp = {
  data: {
    sql_tuned_result: {
      id: 0,
      insight_type: 'missing_index',
      impact: 'High',
      sql_statement:
        'select `t1` . `multi_schema_change_used` as `multi_schema_change_used` , `t1` . `version` as `version` , count ( distinct `t1` . `tracking_id` ) as `count` from ( select max ( `telemetry_tidb_feature_usage` . `multi_schema_change_used` ) as `multi_schema_change_used` , `telemetry ti db instance` . `version` as `version` , `telemetry ti db basic info with date` . `tracking_id` as `tracking_id` from `telemetry_tidb_feature_usage` left join `telemetry_tidb_basic_info_with_date` `telemetry ti db basic info with date` on `telemetry_tidb_feature_usage` . `basic_info_id` = `telemetry ti db basic info with date` . `pk_id` left join `telemetry_tidb_instance` `telemetry ti db instance` on `telemetry_tidb_feature_usage` . `basic_info_id` = `telemetry ti db instance` . `basic_info_id` left join ( select `telemetry_tidb_basic_info_with_date` . `tracking_id` as `tracking_id` , max ( `telemetry ti db instance` . `version` ) as `version` from `telemetry_tidb_basic_info_with_date` left join `telemetry_tidb_instance` `telemetry ti db instance` on `telemetry_tidb_basic_info_with_date` . `pk_id` = `telemetry ti db instance` . `basic_info_id` and `telemetry ti db instance` . `version` and ( not ( ( `telemetry ti db instance` . `version` ) like ? ) ) and `telemetry ti db instance` . `version` \u003c ? group by `telemetry_tidb_basic_info_with_date` . `tracking_id` ) `question 14564` on `telemetry ti db basic info with date` . `tracking_id` = `question 14564` . `tracking_id` where ( ( `telemetry ti db instance` . `version` in ( select `version` from `tidb_versions` where `start_ver` = ? ) ) and ( `lower` ( `telemetry ti db instance` . `up_time` ) like ? ) and `telemetry ti db basic info with date` . `ip` \u003c\u003e ? and `telemetry ti db basic info with date` . `ip` \u003c\u003e ? and `telemetry ti db basic info with date` . `ip` \u003c\u003e ? and not ( `lower` ( `telemetry ti db basic info with date` . `ip` ) like ? ) and not ( `lower` ( `telemetry ti db instance` . `version` ) like ? ) and `telemetry ti db instance` . `version` = `question 14564` . `version` ) group by `telemetry ti db instance` . `version` , `telemetry ti db basic info with date` . `tracking_id` ) as `t1` group by 1 , 2 order by 1 asc , ? asc;',
      sql_digest:
        '078c9df950953e15e03c545f55682f3708929a61348b1960817834c840017cb6',
      plan_digest:
        '434b4b5c2e2fb1b5a0195413e78ce5e2e7c40a68f376275463632ef2977003e6',
      plan: '',
      suggested_command:
        'alter table advisor_task add key $$$$_idx_0000_$$$$$$(cluster_id,telnat_id)',
      used_index: false,
      used_stats: true,
      table_clauses: [
        // exsiting index
        {
          table_name: 'advisor_task',
          where_clause: ['cluster_id', 'telnat_id'],
          selected_fields: null,
          index_list: [
            {
              table_name: 'advisor_task',
              columns: 'PRIMARY(ID)',
              index_name: 'PRIMARY',
              clusterd: true,
              visible: true
            },
            {
              table_name: 'advisor_task',
              columns: 'idx_time(updated_time,created_time)',
              index_name: 'idx_time',
              clusterd: true,
              visible: true
            }
          ]
        },
        {
          table_name: 'advisor_task_history',
          where_clause: ['cluster_id', 'telnat_id_2'],
          selected_fields: null,
          index_list: [
            {
              table_name: 'advisor_task_history',
              columns: 'PRIMARY(ID)',
              index_name: 'PRIMARY',
              clusterd: true,
              visible: true
            },
            {
              table_name: 'advisor_task_history',
              columns: 'idx_time(updated_time,created_time)',
              index_name: 'idx_time',
              clusterd: true,
              visible: true
            }
          ]
        }
      ],
      table_healthies: [
        // table health
        { table_name: 'advisor_task', healthy: '0', analyzed_time: '' }
      ], // []
      analyzed_time: ''
    }
  }
}

export const insightListData = [
  {
    insight: 'this is an insight',
    link: 'https://www.google.com'
  },
  {
    insight: 'this is an insight',
    link: 'https://www.google.com'
  }
]

/**
 * TODO:
 * 1. 确认现在 clinic 上 slowquery detail 是否可以访问
 * 2. clinic 上没有独立的 statement 页面，需要在 clinic 里面添加？
 * 3. 如果 table_clauses 和 table_healthies 为空，返回的值是什么？有哪些值是 optional
 * 4. mockData for `why give this suggestion`
 */
