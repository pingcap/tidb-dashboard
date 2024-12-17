/**
 * Generated by orval v7.3.0 🍺
 * Do not edit manually.
 * Azores Open API
 * OpenAPI spec version: 2.0.0
 */
export type UserServiceListUserRolesParams = {
/**
 * Page size
 */
pageSize?: number;
/**
 * Page token
 */
pageToken?: string;
/**
 * Skip
 */
skip?: number;
/**
 * order_by
 */
orderBy?: string;
/**
 * The name of the user
 */
nameLike?: string;
/**
 * The email of the user
 */
emailLike?: string;
/**
 * The role name of the user
 */
roleName?: string;
};

export type UserServiceDeleteUser200 = { [key: string]: unknown };

export type UserServiceListUsersParams = {
/**
 * Page size
 */
pageSize?: number;
/**
 * Page token
 */
pageToken?: string;
/**
 * Skip
 */
skip?: number;
/**
 * order_by
 */
orderBy?: string;
/**
 * The name of the user
 */
nameLike?: string;
/**
 * The email of the user
 */
emailLike?: string;
};

export type MetricsServiceGetOverviewStatusParams = {
/**
 * Task start time in Unix timestamp format
 */
taskStartTime?: string;
/**
 * Task end time in Unix timestamp format
 */
taskEndTime?: string;
};

export type MetricsServiceGetTopMetricDataParams = {
/**
 * Start time for the query
 */
startTime: string;
/**
 * End time for the query
 */
endTime: string;
/**
 * Step time for the query
 */
step?: string;
/**
 * Limit for the number of top results
 */
limit?: string;
};

export type MetricsServiceGetMetricsGroup = typeof MetricsServiceGetMetricsGroup[keyof typeof MetricsServiceGetMetricsGroup];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const MetricsServiceGetMetricsGroup = {
  unspecified: 'unspecified',
  overview: 'overview',
  basic: 'basic',
  advance: 'advance',
  resource: 'resource',
  performance: 'performance',
  process: 'process',
} as const;

export type MetricsServiceGetMetricsClass = typeof MetricsServiceGetMetricsClass[keyof typeof MetricsServiceGetMetricsClass];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const MetricsServiceGetMetricsClass = {
  unspecified: 'unspecified',
  cluster: 'cluster',
  host: 'host',
  overview: 'overview',
} as const;

export type MetricsServiceGetMetricsParams = {
/**
 * Level 1 classification

 - unspecified: Unspecified
 - cluster: Cluster metrics
 - host: Host metrics
 - overview: Overview metrics
 */
class?: MetricsServiceGetMetricsClass;
/**
 * Level 2 grouping

 - unspecified: Unspecified group
 - overview: Overview group
 - basic: Basic group
 - advance: Advanced group
 - resource: Resource group
 - performance: Performance group
 - process: Process group
 */
group?: MetricsServiceGetMetricsGroup;
/**
 * Level 3 type
 */
type?: string;
/**
 * The metric name
 */
name?: string;
};

export type UserServiceLogout200 = { [key: string]: unknown };

export type UserServiceLogin200 = { [key: string]: unknown };

export type LabelServiceDeleteLabel200 = { [key: string]: unknown };

export type LabelServiceListLabelsParams = {
/**
 * page size
 */
pageSize?: number;
/**
 * page token
 */
pageToken?: string;
/**
 * Skip
 */
skip?: number;
/**
 * order_by
 */
orderBy?: string;
/**
 * the label key of the label
 */
labelKey?: string;
/**
 * the label value of the label
 */
labelValue?: string;
};

export type MetricsServiceGetHostMetricDataParams = {
/**
 * Start time in Unix timestamp format
 */
startTime: string;
/**
 * End time in Unix timestamp format
 */
endTime: string;
/**
 * Step time in seconds
 */
step?: string;
/**
 * Line Label for the metric
 */
label?: string;
/**
 * Time Range for the query
 */
range?: string;
};

export type ClusterServiceGetTopSqlDetailParams = {
/**
 * Begin time
 */
beginTime: string;
/**
 * End time
 */
endTime: string;
};

export type ClusterServiceGetTopSqlListParams = {
/**
 * Begin time
 */
beginTime: string;
/**
 * End time
 */
endTime: string;
/**
 * Database list
 */
db?: string[];
/**
 * SQL Text, used for fuzzy query
 */
text?: string;
/**
 * Order by field
 */
orderBy?: string;
/**
 * Is descending order
 */
isDesc?: boolean;
/**
 * Fields to select, e.g., "Query,Digest"
 */
fields?: string;
/**
 * Page size
 */
pageSize?: number;
/**
 * Page token
 */
pageToken?: string;
/**
 * Skip
 */
skip?: number;
/**
 * Advanced filters, such as "digest = xxx"
 */
advancedFilter?: string[];
};

export type ClusterServiceUnbindSqlPlan200 = { [key: string]: unknown };

export type ClusterServiceUnbindSqlPlanParams = {
/**
 * SQL digest
 */
digest: string;
};

export type ClusterServiceGetSqlPlanBindingListParams = {
/**
 * Begin time
 */
beginTime: string;
/**
 * End time
 */
endTime: string;
/**
 * SQL digest
 */
digest: string;
};

export type ClusterServiceBindSqlPlan200 = { [key: string]: unknown };

export type ClusterServiceGetSqlPlanListParams = {
/**
 * Begin time
 */
beginTime: string;
/**
 * End time
 */
endTime: string;
/**
 * SQL digest
 */
digest?: string;
/**
 * Table name
 */
schemaName?: string;
};

export type ClusterServiceGetSlowQueryDetailParams = {
/**
 * Timestamp
 */
timestamp: number;
/**
 * Connection ID
 */
connectId: string;
};

export type ClusterServiceDownloadSlowQueryListParams = {
/**
 * Begin time in Unix timestamp
 */
beginTime: string;
/**
 * End time in Unix timestamp
 */
endTime: string;
/**
 * List of databases
 */
db?: string[];
/**
 * Search text
 */
text?: string;
/**
 * Order by field
 */
orderBy?: string;
/**
 * Is descending order
 */
isDesc?: boolean;
/**
 * Fields to select, e.g., "Query,Digest"
 */
fields?: string;
/**
 * Page size
 */
pageSize?: number;
/**
 * Page token for pagination
 */
pageToken?: string;
/**
 * Number of records to skip
 */
skip?: number;
/**
 * Advanced filters, such as "digest = xxx"
 */
advancedFilter?: string[];
};

export type ClusterServiceGetSlowQueryListParams = {
/**
 * Begin time in Unix timestamp
 */
beginTime: string;
/**
 * End time in Unix timestamp
 */
endTime: string;
/**
 * List of databases
 */
db?: string[];
/**
 * Search text
 */
text?: string;
/**
 * Order by field
 */
orderBy?: string;
/**
 * Is descending order
 */
isDesc?: boolean;
/**
 * Fields to select, e.g., "Query,Digest"
 */
fields?: string;
/**
 * Page size
 */
pageSize?: number;
/**
 * Page token for pagination
 */
pageToken?: string;
/**
 * Number of records to skip
 */
skip?: number;
/**
 * Advanced filters, such as "digest = xxx"
 */
advancedFilter?: string[];
};

export type ClusterServiceDeleteProcess200 = { [key: string]: unknown };

export type MetricsServiceGetClusterMetricDataParams = {
/**
 * Start time in Unix timestamp format
 */
startTime: string;
/**
 * End time in Unix timestamp format
 */
endTime: string;
/**
 * Step time in seconds
 */
step?: string;
/**
 * Line Label for the metric
 */
label?: string;
/**
 * Time Range for the query
 */
range?: string;
};

/**
 * the label basic resource
 */
export type Temapiv2LabelBody = Temapiv2Label;

export interface V2ValidateSessionResponse {
  userId: string;
}

export type V2UserRoleRoleName = typeof V2UserRoleRoleName[keyof typeof V2UserRoleRoleName];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2UserRoleRoleName = {
  ADMIN: 'ADMIN',
  ALERT_MANAGER: 'ALERT_MANAGER',
  ALERT_READER: 'ALERT_READER',
  BACKUP_MANAGER: 'BACKUP_MANAGER',
  BACKUP_READER: 'BACKUP_READER',
  CLUSTER_MANAGER: 'CLUSTER_MANAGER',
  CLUSTER_READER: 'CLUSTER_READER',
  HOST_MANAGER: 'HOST_MANAGER',
  HOST_READER: 'HOST_READER',
  USER_MANAGER: 'USER_MANAGER',
  AUDIT_MANAGER: 'AUDIT_MANAGER',
  SYSTEM_MANAGER: 'SYSTEM_MANAGER',
  SYSTEM_READER: 'SYSTEM_READER',
} as const;

export interface V2UserRole {
  email?: string;
  name: string;
  note?: string;
  roleId?: string;
  roleName?: V2UserRoleRoleName;
  userId: string;
}

export interface V2User {
  email?: string;
  id: string;
  name: string;
  password?: string;
  userId: string;
}

export interface V2TopSqlDetail {
  avg_affected_rows?: string;
  avg_backoff_time?: string;
  avg_commit_backoff_time?: string;
  avg_commit_time?: string;
  avg_compile_latency?: string;
  avg_cop_process_time?: string;
  avg_cop_wait_time?: string;
  avg_disk?: string;
  avg_get_commit_ts_time?: string;
  avg_latency?: string;
  avg_local_latch_wait_time?: string;
  avg_mem?: string;
  avg_parse_latency?: string;
  avg_prewrite_regions?: string;
  avg_prewrite_time?: string;
  avg_process_time?: string;
  avg_processed_keys?: string;
  avg_resolve_lock_time?: string;
  avg_rocksdb_block_cache_hit_count?: string;
  avg_rocksdb_block_read_byte?: string;
  avg_rocksdb_block_read_count?: string;
  avg_rocksdb_delete_skipped_count?: string;
  avg_rocksdb_key_skipped_count?: string;
  avg_total_keys?: string;
  avg_txn_retry?: string;
  avg_wait_time?: string;
  avg_write_keys?: string;
  avg_write_size?: string;
  binary_plan?: string;
  binary_plan_text?: string;
  digest?: string;
  digest_text?: string;
  exec_count?: string;
  first_seen?: string;
  index_names?: string;
  last_seen?: string;
  max_backoff_time?: string;
  max_commit_backoff_time?: string;
  max_commit_time?: string;
  max_compile_latency?: string;
  max_cop_process_time?: string;
  max_cop_wait_time?: string;
  max_disk?: string;
  max_get_commit_ts_time?: string;
  max_latency?: string;
  max_local_latch_wait_time?: string;
  max_mem?: string;
  max_parse_latency?: string;
  max_prewrite_regions?: string;
  max_prewrite_time?: string;
  max_process_time?: string;
  max_processed_keys?: string;
  max_resolve_lock_time?: string;
  max_rocksdb_block_cache_hit_count?: string;
  max_rocksdb_block_read_byte?: string;
  max_rocksdb_block_read_count?: string;
  max_rocksdb_delete_skipped_count?: string;
  max_rocksdb_key_skipped_count?: string;
  max_total_keys?: string;
  max_txn_retry?: string;
  max_wait_time?: string;
  max_write_keys?: string;
  max_write_size?: string;
  min_latency?: string;
  plan?: string;
  plan_can_be_bound?: boolean;
  plan_count?: string;
  plan_digest?: string;
  plan_hint?: string;
  prev_sample_text?: string;
  query_sample_text?: string;
  related_schemas?: string;
  sample_user?: string;
  schema_name?: string;
  stmt_type?: string;
  sum_backoff_times?: string;
  sum_cop_task_num?: string;
  sum_errors?: string;
  sum_latency?: string;
  sum_warnings?: string;
  summary_begin_time?: string;
  summary_end_time?: string;
  table_names?: string;
}

export interface V2TopSqlList {
  data?: V2TopSqlDetail[];
  nextPageToken?: string;
  totalSize?: string;
}

export interface V2TopSqlAvailableFields {
  fields?: string[];
}

export interface V2TopMetricData {
  data?: V2ExprQueryData[];
  status?: string;
}

export interface V2StatusCount {
  count?: number;
  status?: string;
}

export interface V2SqlPlanList {
  data?: V2TopSqlDetail[];
}

export interface V2SqlPlanBindingDetail {
  digest?: string;
  planDigest?: string;
  source?: V2SqlPlanBindingDetailSource;
  status?: V2SqlPlanBindingDetailStatus;
}

export interface V2SqlPlanBindingList {
  data?: V2SqlPlanBindingDetail[];
}

export type V2SqlPlanBindingDetailStatus = typeof V2SqlPlanBindingDetailStatus[keyof typeof V2SqlPlanBindingDetailStatus];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2SqlPlanBindingDetailStatus = {
  enabled: 'enabled',
  using: 'using',
  disabled: 'disabled',
  deleted: 'deleted',
  invalid: 'invalid',
  rejected: 'rejected',
  pending_verify: 'pending verify',
} as const;

export type V2SqlPlanBindingDetailSource = typeof V2SqlPlanBindingDetailSource[keyof typeof V2SqlPlanBindingDetailSource];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2SqlPlanBindingDetailSource = {
  manual: 'manual',
  history: 'history',
  capture: 'capture',
  evolve: 'evolve',
} as const;

export interface V2SlowQueryDownloadResponse {
  fileContent?: string;
  filename?: string;
}

export interface V2SlowQueryDetail {
  backoff_detail?: string;
  backoff_time?: number;
  backoff_total?: number;
  backoff_types?: string;
  binary_plan?: string;
  binary_plan_text?: string;
  commit_backoff_time?: number;
  commit_time?: number;
  compile_time?: number;
  connection_id?: string;
  cop_proc_addr?: string;
  cop_proc_avg?: number;
  cop_proc_max?: number;
  cop_proc_p90?: number;
  cop_time?: number;
  cop_wait_addr?: string;
  cop_wait_avg?: number;
  cop_wait_max?: number;
  cop_wait_p90?: number;
  db?: string;
  digest?: string;
  disk_max?: string;
  exec_retry_count?: string;
  exec_retry_time?: number;
  get_commit_ts_time?: number;
  has_more_results?: boolean;
  host?: string;
  index_names?: string;
  instance?: string;
  is_explicit_txn?: boolean;
  is_internal?: string;
  kv_total?: number;
  local_latch_wait_time?: number;
  lock_keys_time?: number;
  mem_max?: string;
  optimize_time?: number;
  parse_time?: number;
  pd_total?: number;
  plan?: string;
  plan_digest?: string;
  plan_from_binding?: string;
  plan_from_cache?: string;
  prepared?: string;
  preproc_subqueries?: string;
  preproc_subqueries_time?: number;
  prev_stmt?: string;
  prewrite_region?: string;
  prewrite_time?: number;
  process_keys?: number;
  process_time?: number;
  query?: string;
  query_time?: number;
  request_count?: number;
  request_unit_read?: number;
  request_unit_write?: number;
  resolve_lock_time?: number;
  resource_group?: string;
  result_rows?: string;
  rewrite_time?: number;
  rocksdb_block_cache_hit_count?: number;
  rocksdb_block_read_byte?: number;
  rocksdb_block_read_count?: number;
  rocksdb_delete_skipped_count?: number;
  rocksdb_key_skipped_count?: number;
  session_alias?: string;
  stats?: string;
  success?: string;
  tidb_cpu_time?: number;
  tikv_cpu_time?: number;
  time_queued_by_rc?: number;
  timestamp?: number;
  total_keys?: number;
  txn_retry?: string;
  txn_start_ts?: string;
  user?: string;
  wait_prewrite_binlog_time?: number;
  wait_time?: number;
  wait_ts?: number;
  warnings?: string;
  write_keys?: string;
  write_size?: string;
  write_sql_response_total?: number;
}

export interface V2SlowQueryList {
  data?: V2SlowQueryDetail[];
  nextPageToken?: string;
  totalSize?: string;
}

export interface V2SlowQueryAvailableFields {
  fields?: string[];
}

export interface V2SlowQueryAvailableAdvancedFilters {
  filters?: string[];
}

export interface V2QueryMetric {
  device?: string;
  fstype?: string;
  instance?: string;
  job?: string;
  kind?: string;
  module?: string;
  mountpoint?: string;
  ping?: string;
  result?: string;
  sqlType?: string;
  txnMode?: string;
  type?: string;
}

export interface V2QueryResult {
  metric?: V2QueryMetric;
  values?: Metricsv2Value[];
}

export interface V2ProcessList {
  activeProcessCount?: string;
  clusterProcessList?: V2ClusterProcess[];
  isSupportKill?: boolean;
  totalProcessCount?: string;
}

export interface V2OverviewStatus {
  alertLevels?: V2StatusCount[];
  alerts?: V2StatusCount[];
  brTasks?: V2StatusCount[];
  clusters?: V2StatusCount[];
  hosts?: V2StatusCount[];
  otherTasks?: V2StatusCount[];
  sysTasks?: V2StatusCount[];
}

export interface V2Metrics {
  metrics?: V2CategoryMetricDetail[];
}

export interface V2LoginRequest {
  password?: string;
  userId: string;
}

export interface V2ListUsersResponse {
  nextPageToken?: string;
  totalSize?: number;
  users?: V2User[];
}

export interface V2ListUserRolesResponse {
  nextPageToken?: string;
  totalSize?: number;
  users?: V2UserRole[];
}

export interface V2LabelWithBindObject {
  bindObjects?: V2BindObject[];
  label?: Temapiv2Label;
}

export interface V2ListLabelsResponse {
  labels?: V2LabelWithBindObject[];
  nextPageToken?: string;
  totalSize?: number;
}

/**
 * - unspecified: Unspecified group
 - overview: Overview group
 - basic: Basic group
 - advance: Advanced group
 - resource: Resource group
 - performance: Performance group
 - process: Process group
 */
export type V2GroupEnumData = typeof V2GroupEnumData[keyof typeof V2GroupEnumData];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2GroupEnumData = {
  unspecified: 'unspecified',
  overview: 'overview',
  basic: 'basic',
  advance: 'advance',
  resource: 'resource',
  performance: 'performance',
  process: 'process',
} as const;

export interface V2ExpressionWithLegend {
  labels?: string[];
  legend?: string;
  maxTidbVersion?: string;
  minTidbVersion?: string;
  name?: string;
  promMetric?: string;
  promql?: string;
  type?: string;
}

export interface V2MetricWithExpressions {
  description?: string;
  expressions?: V2ExpressionWithLegend[];
  isBuiltin?: boolean;
  maxTidbVersion?: string;
  minTidbVersion?: string;
  name?: string;
  unit?: string;
}

export interface V2ExprQueryData {
  expr?: string;
  legend?: string;
  result?: V2QueryResult[];
}

export interface V2HostMetricData {
  data?: V2ExprQueryData[];
  status?: string;
}

export type V2ClusterProcessCommand = typeof V2ClusterProcessCommand[keyof typeof V2ClusterProcessCommand];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2ClusterProcessCommand = {
  Sleep: 'Sleep',
  Quit: 'Quit',
  Init_DB: 'Init DB',
  Query: 'Query',
  Field_List: 'Field List',
  Create_DB: 'Create DB',
  Drop_DB: 'Drop DB',
  Refresh: 'Refresh',
  Shutdown: 'Shutdown',
  Statistics: 'Statistics',
  Processlist: 'Processlist',
  Connect: 'Connect',
  Kill: 'Kill',
  Debug: 'Debug',
  Ping: 'Ping',
  Time: 'Time',
  Delayed_Insert: 'Delayed Insert',
  Change_User: 'Change User',
  Binlog_Dump: 'Binlog Dump',
  Table_Dump: 'Table Dump',
  Connect_out: 'Connect out',
  Register_Slave: 'Register Slave',
  Prepare: 'Prepare',
  Execute: 'Execute',
  Long_Data: 'Long Data',
  Close_stmt: 'Close stmt',
  Reset_stmt: 'Reset stmt',
  Set_option: 'Set option',
  Fetch: 'Fetch',
  Daemon: 'Daemon',
  Reset_connect: 'Reset connect',
} as const;

export interface V2ClusterProcess {
  command?: V2ClusterProcessCommand;
  db?: string;
  digest?: string;
  disk?: string;
  host?: string;
  id?: string;
  info?: string;
  instance?: string;
  mem?: string;
  resourceGroup?: string;
  rowsAffected?: string;
  sessionAlias?: string;
  state?: string;
  tidbCpu?: string;
  tikvCpu?: string;
  time?: string;
  txnStart?: string;
  user?: string;
}

export interface V2ClusterMetricInstance {
  instanceList?: string[];
  type?: string;
}

export interface V2ClusterMetricData {
  data?: V2ExprQueryData[];
  status?: string;
}

/**
 * - unspecified: Unspecified
 - cluster: Cluster metrics
 - host: Host metrics
 - overview: Overview metrics
 */
export type V2ClassEnumData = typeof V2ClassEnumData[keyof typeof V2ClassEnumData];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const V2ClassEnumData = {
  unspecified: 'unspecified',
  cluster: 'cluster',
  host: 'host',
  overview: 'overview',
} as const;

export interface V2CheckSupportResponse {
  isSupport?: boolean;
}

export interface V2CategoryMetricDetail {
  class?: string;
  description?: string;
  displayName?: string;
  group?: string;
  metric?: V2MetricWithExpressions;
  name?: string;
  order?: number;
  type?: string;
}

export interface V2BindResourceResponse {
  labelIds?: string[];
}

export interface V2BindResourceRequest {
  appendLabelIds?: string[];
  removeLabelIds?: string[];
  resourceId: string;
  resourceType: string;
}

export interface V2BindObject {
  resourceIds: string[];
  resourceType: string;
}

export interface V2BindLabelResponse {
  label?: V2LabelWithBindObject;
}

export interface V2BindLabelRequest {
  appendBindObjects?: V2BindObject[];
  labelId: string;
  removeBindObjects?: V2BindObject[];
}

export interface Temapiv2Label {
  labelId?: string;
  labelKey?: string;
  labelValue: string;
}

/**
 * `Any` contains an arbitrary serialized protocol buffer message along with a
URL that describes the type of the serialized message.

Protobuf library provides support to pack/unpack Any values in the form
of utility functions or additional generated methods of the Any type.

Example 1: Pack and unpack a message in C++.

    Foo foo = ...;
    Any any;
    any.PackFrom(foo);
    ...
    if (any.UnpackTo(&foo)) {
      ...
    }

Example 2: Pack and unpack a message in Java.

    Foo foo = ...;
    Any any = Any.pack(foo);
    ...
    if (any.is(Foo.class)) {
      foo = any.unpack(Foo.class);
    }
    // or ...
    if (any.isSameTypeAs(Foo.getDefaultInstance())) {
      foo = any.unpack(Foo.getDefaultInstance());
    }

 Example 3: Pack and unpack a message in Python.

    foo = Foo(...)
    any = Any()
    any.Pack(foo)
    ...
    if any.Is(Foo.DESCRIPTOR):
      any.Unpack(foo)
      ...

 Example 4: Pack and unpack a message in Go

     foo := &pb.Foo{...}
     any, err := anypb.New(foo)
     if err != nil {
       ...
     }
     ...
     foo := &pb.Foo{}
     if err := any.UnmarshalTo(foo); err != nil {
       ...
     }

The pack methods provided by protobuf library will by default use
'type.googleapis.com/full.type.name' as the type URL and the unpack
methods only use the fully qualified type name after the last '/'
in the type URL, for example "foo.bar.com/x/y.z" will yield type
name "y.z".

JSON
====
The JSON representation of an `Any` value uses the regular
representation of the deserialized, embedded message, with an
additional field `@type` which contains the type URL. Example:

    package google.profile;
    message Person {
      string first_name = 1;
      string last_name = 2;
    }

    {
      "@type": "type.googleapis.com/google.profile.Person",
      "firstName": <string>,
      "lastName": <string>
    }

If the embedded message type is well-known and has a custom JSON
representation, that representation will be embedded adding a field
`value` which holds the custom JSON in addition to the `@type`
field. Example (for message [google.protobuf.Duration][]):

    {
      "@type": "type.googleapis.com/google.protobuf.Duration",
      "value": "1.212s"
    }
 */
export interface ProtobufAny {
  /** A URL/resource name that uniquely identifies the type of the serialized
protocol buffer message. This string must contain at least
one "/" character. The last segment of the URL's path must represent
the fully qualified name of the type (as in
`path/google.protobuf.Duration`). The name should be in a canonical form
(e.g., leading "." is not accepted).

In practice, teams usually precompile into the binary all types that they
expect it to use in the context of Any. However, for URLs which use the
scheme `http`, `https`, or no scheme, one can optionally set up a type
server that maps type URLs to message definitions as follows:

* If no scheme is provided, `https` is assumed.
* An HTTP GET on the URL must yield a [google.protobuf.Type][]
  value in binary format, or produce an error.
* Applications are allowed to cache lookup results based on the
  URL, or have them precompiled into a binary to avoid any
  lookup. Therefore, binary compatibility needs to be preserved
  on changes to types. (Use versioned type names to manage
  breaking changes.)

Note: this functionality is not currently available in the official
protobuf release, and it is not used for type URLs beginning with
type.googleapis.com. As of May 2023, there are no widely used type server
implementations and no plans to implement one.

Schemes other than `http`, `https` (or the empty scheme) might be
used with implementation specific semantics. */
  '@type'?: string;
  [key: string]: unknown;
}

export type RpcStatusError = {
  code?: number;
  details?: ProtobufAny[];
  message?: string;
  status?: string;
};

export interface RpcStatus {
  error?: RpcStatusError;
}

export interface Metricsv2Value {
  timestamp?: number;
  value?: string;
}

