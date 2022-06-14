import { format } from '@baurine/sql-formatter-plus'

export default function formatSql(sql?: string): string {
  let formatedSQL = sql || ''
  try {
    formatedSQL = format(sql || '', { uppercase: true, language: 'tidb' })
  } catch (err) {
    console.log(err)
    console.log(sql)
  }
  return formatedSQL
}

// ------------------
// a hack way to do unit test for formatSQL method
if (process.env.NODE_ENV === 'development' || process.env.E2E_TEST === 'true') {
  function test() {
    const oriSQLs = [
      'select distinct `floor` ( `unix_timestamp` ( `summary_begin_time` ) ) as `begin_time` , `floor` ( `unix_timestamp` ( `summary_end_time` ) ) as `end_time` from `information_schema` . `cluster_statements_summary_history` order by `begin_time` desc , `end_time` desc',

      'select `topics` . `id` from `topics` left outer join `categories` on `categories` . `id` = `topics` . `category_id` where ( `topics` . `archetype` <> ? ) and ( coalesce ( `categories` . `topic_id` , ? ) <> `topics` . `id` ) and `topics` . `visible` = true and ( `topics` . `deleted_at` is ? ) and ( `topics` . `category_id` is ? or `topics` . `category_id` in ( ... ) ) and ( `topics` . `category_id` != ? ) and `topics` . `closed` = false and `topics` . `archived` = false and ( `topics` . `created_at` > ? ) order by `rand` ( ) limit ?',

      'update `app_tidb_en`.`useranyone` set `Today` = \'2022-12-28 15:29:35.604\', `DigTreasureNoPrizeCount` = 1, `DigTreasureDrawCount` = 4, `IntegralExchangeSendName` = NULL, `IntegralExchangeSendPhone` = NULL, `IntegralExchangeSendAddress` = NULL, `DayResetTaskData` = \'{"38":{"Value":5,"HasGet":true,"GetCount":5},"23":{"Value":1,"HasGet":true,"GetCount":0},"15":{"Value":10,"HasGet":true,"GetCount":1},"16":{"Value":30,"HasGet":true,"GetCount":1},"17":{"Value":60,"HasGet":true,"GetCount":1},"22":{"Value":1,"HasGet":false,"GetCount":0}}\',`NotDayResetTaskData` = \'{"27":{"Value":1,"HasGet":true,"GetCount":0},"34":{"Value":1,"HasGet":true,"GetCount":0},"28":{"Value":1,"HasGet":true,"GetCount":0},"18":{"Value":1,"HasGet":false,"GetCount":0},"45":{"Value":1,"HasGet":true,"GetCount":1}}\', `Id` = 11111 WHERE `Id` = 11111 LIMIT 1;',

      'insert into event_log(`all_json`,`track_id`,`distinct_id`,`lib`,`event`,`type`,`created_at`,`date`,`hour`,`user_agent`,`host`,`connection`,`pragma`,`cache_control`,`accept`,`accept_encoding`,`accept_language`,`ip`,`ip_city`,`ip_asn`,`url`,`referrer`,`remark`,`ua_platform`,`ua_browser`,`ua_version`,`ua_language`) values (\'{   "login_id": "11111",   "time": 1640768088867,   "anonymous_id": "12345",   "event": "$AppViewScreen",   "_track_id": 12345,   "_flush_time": 1640768092287,   "properties": {     "$os": "iOS",     "$app_id": "com.app",     "$screen_width": 375,     "$app_version": "1.0.0",     "deviceLang": "zh_TW",     "$is_first_day": false,     "appChannel": "ios_apple",     "$device_id": "12345",     "$model": "iPhone9,4",     "$carrier": "Chunghwa Telecom LDM",     "appCoreVer": "3",     "$network_type": "3G",     "$app_name": "app_name",     "$wifi": false,     "appProductX": "172",     "$timezone_offset": -480,     "$url": "app_name.CDPageViewController",     "mac": "",     "appVersionCode": "1",     "$screen_height": 667,     "appId": "11111",     "$referrer": "app.CDPageBeforeViewController",     "$lib_method": "autoTrack",     "$screen_name": "app.CDPageViewController",     "$lib_version": "1.0.0",     "$os_version": "14.8.1",     "$lib": "iOS",     "appLangId": "2",     "$manufacturer": "Apple",     "idfa": "00000000-0000-0000-0000-000000000000"   },   "lib": {     "$lib_detail": "app.CDPageViewController######",     "$lib_version": "1.0.0",     "$lib": "iOS",     "$app_version": "1.0.0",     "$lib_method": "autoTrack"   },   "distinct_id": "1111",   "type": "track" }\',"1111","111","iOS","$AppViewScreen","track",111,timestamp("2022-12-29 00:00:00.000000"),16,"SensorsAnalytics iOS SDK","log.app.com",NULL,NULL,NULL,"","gzip, deflate, br","","111.111","{}","{}","url",NULL,"online","","","","");'
    ]

    const expects = [
      'SELECT\n  DISTINCT `floor` (`unix_timestamp` (`summary_begin_time`)) AS `begin_time`,\n  `floor` (`unix_timestamp` (`summary_end_time`)) AS `end_time`\nFROM\n  `information_schema`.`cluster_statements_summary_history`\nORDER BY\n  `begin_time` DESC,\n  `end_time` DESC',

      'SELECT\n  `topics`.`id`\nFROM\n  `topics`\n  LEFT OUTER JOIN `categories` ON `categories`.`id` = `topics`.`category_id`\nWHERE\n  (`topics`.`archetype` <> ?)\n  AND (\n    coalesce (`categories`.`topic_id`, ?) <> `topics`.`id`\n  )\n  AND `topics`.`visible` = TRUE\n  AND (`topics`.`deleted_at` IS ?)\n  AND (\n    `topics`.`category_id` IS ?\n    OR `topics`.`category_id` IN (...)\n  )\n  AND (`topics`.`category_id` != ?)\n  AND `topics`.`closed` = false\n  AND `topics`.`archived` = false\n  AND (`topics`.`created_at` > ?)\nORDER BY\n  `rand` ()\nLIMIT\n  ?',

      'UPDATE\n  `app_tidb_en`.`useranyone`\nSET\n  `Today` = \'2022-12-28 15:29:35.604\',\n  `DigTreasureNoPrizeCount` = 1,\n  `DigTreasureDrawCount` = 4,\n  `IntegralExchangeSendName` = NULL,\n  `IntegralExchangeSendPhone` = NULL,\n  `IntegralExchangeSendAddress` = NULL,\n  `DayResetTaskData` = \'{"38":{"Value":5,"HasGet":true,"GetCount":5},"23":{"Value":1,"HasGet":true,"GetCount":0},"15":{"Value":10,"HasGet":true,"GetCount":1},"16":{"Value":30,"HasGet":true,"GetCount":1},"17":{"Value":60,"HasGet":true,"GetCount":1},"22":{"Value":1,"HasGet":false,"GetCount":0}}\',\n  `NotDayResetTaskData` = \'{"27":{"Value":1,"HasGet":true,"GetCount":0},"34":{"Value":1,"HasGet":true,"GetCount":0},"28":{"Value":1,"HasGet":true,"GetCount":0},"18":{"Value":1,"HasGet":false,"GetCount":0},"45":{"Value":1,"HasGet":true,"GetCount":1}}\',\n  `Id` = 11111\nWHERE\n  `Id` = 11111\nLIMIT\n  1;',

      'INSERT INTO\n  event_log(\n    `all_json`,\n    `track_id`,\n    `distinct_id`,\n    `lib`,\n    `event`,\n    `type`,\n    `created_at`,\n    `date`,\n    `hour`,\n    `user_agent`,\n    `host`,\n    `connection`,\n    `pragma`,\n    `cache_control`,\n    `accept`,\n    `accept_encoding`,\n    `accept_language`,\n    `ip`,\n    `ip_city`,\n    `ip_asn`,\n    `url`,\n    `referrer`,\n    `remark`,\n    `ua_platform`,\n    `ua_browser`,\n    `ua_version`,\n    `ua_language`\n  )\nVALUES\n  (\n    \'{   "login_id": "11111",   "time": 1640768088867,   "anonymous_id": "12345",   "event": "$AppViewScreen",   "_track_id": 12345,   "_flush_time": 1640768092287,   "properties": {     "$os": "iOS",     "$app_id": "com.app",     "$screen_width": 375,     "$app_version": "1.0.0",     "deviceLang": "zh_TW",     "$is_first_day": false,     "appChannel": "ios_apple",     "$device_id": "12345",     "$model": "iPhone9,4",     "$carrier": "Chunghwa Telecom LDM",     "appCoreVer": "3",     "$network_type": "3G",     "$app_name": "app_name",     "$wifi": false,     "appProductX": "172",     "$timezone_offset": -480,     "$url": "app_name.CDPageViewController",     "mac": "",     "appVersionCode": "1",     "$screen_height": 667,     "appId": "11111",     "$referrer": "app.CDPageBeforeViewController",     "$lib_method": "autoTrack",     "$screen_name": "app.CDPageViewController",     "$lib_version": "1.0.0",     "$os_version": "14.8.1",     "$lib": "iOS",     "appLangId": "2",     "$manufacturer": "Apple",     "idfa": "00000000-0000-0000-0000-000000000000"   },   "lib": {     "$lib_detail": "app.CDPageViewController######",     "$lib_version": "1.0.0",     "$lib": "iOS",     "$app_version": "1.0.0",     "$lib_method": "autoTrack"   },   "distinct_id": "1111",   "type": "track" }\',\n    "1111",\n    "111",\n    "iOS",\n    "$AppViewScreen",\n    "track",\n    111,\n    timestamp("2022-12-29 00:00:00.000000"),\n    16,\n    "SensorsAnalytics iOS SDK",\n    "log.app.com",\n    NULL,\n    NULL,\n    NULL,\n    "",\n    "gzip, deflate, br",\n    "",\n    "111.111",\n    "{}",\n    "{}",\n    "url",\n    NULL,\n    "online",\n    "",\n    "",\n    "",\n    ""\n  );'
    ]

    oriSQLs.forEach((s, idx) => {
      const f = formatSql(s)
      if (f !== expects[idx]) {
        console.log('expected:', expects[idx])
        console.log('received:', f)
        throw new Error(`Format sql failed!, idx: ${idx}`)
      }
    })
  }

  test()
}
