// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

type clusterInspection struct {
	referStartTime string
	referEndTime   string
	startTime      string
	endTime        string
	db             *gorm.DB
}

func CompareDiagnose(referStartTime, referEndTime, startTime, endTime string, db *gorm.DB) (TableDef, *TableRowDef) {
	c := &clusterInspection{
		referStartTime: referStartTime,
		referEndTime:   referEndTime,
		startTime:      startTime,
		endTime:        endTime,
		db:             db,
	}
	table := TableDef{
		Category: []string{CategoryDiagnose},
		Title:    "compare_diagnose",
		Comment:  "",
		Column:   []string{"RULE", "DETAIL"},
	}
	details, err := c.inspectForAffectByBigQuery()
	if err != nil {
		return table, &TableRowDef{Values: []string{strings.Join(table.Category, ","), table.Title, err.Error()}}
	}
	if len(details) > 0 {
		subRows := make([][]string, 0, len(details))
		for i := range details {
			subRows = append(subRows, []string{"", details[i]})
		}
		row := TableRowDef{
			Values: []string{
				"big-query",
				"may have big query in diagnose time range",
			},
			SubValues: subRows,
			Comment:   "diagnose for big query/write that affect the qps or duration",
		}
		table.Rows = []TableRowDef{row}
	}
	return table, nil
}

func (c *clusterInspection) inspectForAffectByBigQuery() ([]string, error) {
	checks := []struct {
		query     metricQuery
		ct        compareType
		threshold float64
	}{
		{
			query: &queryQPS{
				baseQuery: baseQuery{
					table:  "tidb_qps",
					labels: []string{"instance"},
				},
			},
			ct:        compareLT,
			threshold: 0.95,
		},
		{
			query: &queryQuantile{
				baseQuery: baseQuery{
					table:     "tidb_query_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 1.2,
		},
	}
	otherInfoChecks := []struct {
		query     metricQuery
		ct        compareType
		threshold float64
	}{
		{
			query: &queryQuantile{
				baseQuery: baseQuery{
					table:     "tidb_cop_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 2,
		},
		{
			// Check for big write transaction
			query: &queryQuantile{
				baseQuery: baseQuery{
					table:     "tidb_kv_write_num",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 2,
		},
		{
			query: &queryTotal{
				baseQuery: baseQuery{
					table:  "tikv_cop_scan_keys_total_num",
					labels: []string{"instance"},
				},
			},
			ct:        compareGT,
			threshold: 2.0,
		},
		{
			// Check for tikv storage handle time
			query: &queryQuantile{
				baseQuery: baseQuery{
					table:     "tikv_storage_async_request_duration",
					labels:    []string{"instance", "type"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 2,
		},
		{
			query: &queryTotal{
				baseQuery: baseQuery{
					table:  "pd_operator_step_finish_total_count",
					labels: []string{"type"},
				},
			},
			ct:        compareGT,
			threshold: 1.0,
		},
	}
	totalDiffs := make([]metricDiff, 0, len(checks))
	for _, ck := range checks {
		err := c.compareMetric(ck.query)
		if err != nil {
			return nil, err
		}
		partDiffs := ck.query.compare()
		partDiffs = checkDiffs(partDiffs, ck.ct, ck.threshold)
		totalDiffs = append(totalDiffs, partDiffs...)
	}
	// If both qps and query latency was not become worse, return.
	if len(totalDiffs) == 0 {
		return nil, nil
	}

	// Only for get more information
	for _, ck := range otherInfoChecks {
		err := c.compareMetric(ck.query)
		if err != nil {
			continue
		}
		partDiffs := ck.query.compare()
		partDiffs = checkDiffs(partDiffs, ck.ct, ck.threshold)
		totalDiffs = append(totalDiffs, partDiffs...)
	}

	var detailSQL string
	var err error
	detailSQL, err = c.queryBigQueryInSlowLog()
	if err != nil {
		return nil, err
	}
	if len(detailSQL) == 0 {
		detailSQL, err = c.queryExpensiveQueryInTiDBLog()
		if err != nil {
			return nil, err
		}
	}
	details := genMetricDiffsString(totalDiffs)
	if len(detailSQL) > 0 {
		details = append(details, "try to check the slow query only appear in diagnose time range with sql: \n"+detailSQL)
	}
	return details, nil
}

func (c *clusterInspection) compareMetric(query metricQuery) error {
	arg := &queryArg{
		startTime: c.referStartTime,
		endTime:   c.referEndTime,
	}
	err := queryMetric(query, arg, c.db)
	if err != nil {
		return err
	}
	query.setRefer()

	arg.startTime = c.startTime
	arg.endTime = c.endTime
	err = queryMetric(query, arg, c.db)
	if err != nil {
		return err
	}
	query.setCurrent()
	return nil
}

type metricQuery interface {
	init()
	setRefer()
	setCurrent()
	compare() []metricDiff
	generateSQL(arg *queryArg) string
	appendRow(row []string) error
}

type baseQuery struct {
	table     string
	labels    []string
	condition string
}

func (b *baseQuery) genCondition(arg *queryArg) string {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", arg.startTime, arg.endTime)
	if len(b.condition) > 0 {
		condition = condition + "and " + b.condition
	}
	return condition
}

type avgMaxMin struct {
	avg int
	max int
	min int
}

type queryQPS struct {
	baseQuery
	result map[string]avgMaxMin

	refer   map[string]avgMaxMin
	current map[string]avgMaxMin
}

func (s *queryQPS) init() {
	s.result = make(map[string]avgMaxMin)
}

func (s *queryQPS) setRefer() {
	s.refer = s.result
	s.result = nil
}

func (s *queryQPS) setCurrent() {
	s.current = s.result
	s.result = nil
}

func (s *queryQPS) compare() []metricDiff {
	diffs := make([]metricDiff, 0, len(s.current))
	for label, v := range s.current {
		rv := s.refer[label]
		diff := newMetricDiff(s.table, label, float64(rv.avg), float64(v.avg))
		diffs = append(diffs, diff)
	}
	return diffs
}

func (s *queryQPS) generateSQL(arg *queryArg) string {
	field := ""
	for i, label := range s.labels {
		if i > 0 {
			field += ","
		}
		field = field + "t1.`" + label + "`"
	}
	condition := s.genCondition(arg)
	sql := fmt.Sprintf("select %[4]s, avg(value),max(value),min(value) from (select `%[3]v`, sum(value) as value from metrics_schema.%[1]s %[2]s group by `%[3]s`,time) as t1 group by %[4]s having avg(value)>0",
		s.table, condition, strings.Join(s.labels, "`,`"), field)
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	sql = prepareSQL + sql
	return sql
}

func (s *queryQPS) appendRow(row []string) error {
	label := strings.Join(row[:len(s.labels)], ",")
	values, err := batchAtoi(row[len(s.labels):])
	if err != nil {
		return err
	}

	s.result[label] = avgMaxMin{
		avg: values[0],
		max: values[1],
		min: values[2],
	}
	return nil
}

func queryMetric(query metricQuery, arg *queryArg, db *gorm.DB) error {
	query.init()
	sql := query.generateSQL(arg)
	rows, err := querySQL(db, sql)
	if err != nil {
		return err
	}
	for _, row := range rows {
		err = query.appendRow(row)
		if err != nil {
			return err
		}
	}
	return nil
}

type queryQuantile struct {
	baseQuery
	result  map[string]durationValue
	refer   map[string]durationValue
	current map[string]durationValue
}

type durationValue struct {
	avg float64
	max float64
}

func (s *queryQuantile) init() {
	s.result = make(map[string]durationValue)
}

func (s *queryQuantile) setRefer() {
	s.refer = s.result
	s.result = nil
}

func (s *queryQuantile) setCurrent() {
	s.current = s.result
	s.result = nil
}

func (s *queryQuantile) compare() []metricDiff {
	diffs := make([]metricDiff, 0, len(s.current))
	for label, v := range s.current {
		rv := s.refer[label]
		diff := newMetricDiff(s.table, label, rv.avg, v.avg)
		diffs = append(diffs, diff)
	}
	return diffs
}

func (s *queryQuantile) generateSQL(arg *queryArg) string {
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	sql := fmt.Sprintf("select `%[1]s`, avg(value),max(value) from metrics_schema.%[2]s %[3]s group by `%[1]s`",
		strings.Join(s.labels, "`,`"), s.table, s.genCondition(arg))
	sql = prepareSQL + sql
	return sql
}

func (s *queryQuantile) appendRow(row []string) error {
	label := strings.Join(row[:len(s.labels)], ",")
	values, err := batchAtof(row[len(s.labels):])
	if err != nil {
		return err
	}

	s.result[label] = durationValue{
		avg: values[0],
		max: values[1],
	}
	return nil
}

type queryTotal struct {
	baseQuery
	result  map[string]float64
	refer   map[string]float64
	current map[string]float64
}

func (s *queryTotal) init() {
	s.result = make(map[string]float64)
}

func (s *queryTotal) setRefer() {
	s.refer = s.result
	s.result = nil
}

func (s *queryTotal) setCurrent() {
	s.current = s.result
	s.result = nil
}

func (s *queryTotal) compare() []metricDiff {
	diffs := make([]metricDiff, 0, len(s.current))
	for label, v := range s.current {
		rv := s.refer[label]
		diff := newMetricDiff(s.table, label, rv, v)
		diffs = append(diffs, diff)
	}
	return diffs
}

func (s *queryTotal) generateSQL(arg *queryArg) string {
	prepareSQL := "set @@tidb_metric_query_step=60;set @@tidb_metric_query_range_duration=60;"
	sql := fmt.Sprintf("select `%[1]s`, sum(value) as total from metrics_schema.%[2]s %[3]s group by `%[1]s` having total > 0",
		strings.Join(s.labels, "`,`"), s.table, s.genCondition(arg))
	sql = prepareSQL + sql
	return sql
}

func (s *queryTotal) appendRow(row []string) error {
	label := strings.Join(row[:len(s.labels)], ",")
	values, err := batchAtof(row[len(s.labels):])
	if err != nil {
		return err
	}

	s.result[label] = values[0]
	return nil
}

func (c *clusterInspection) queryBigQueryInSlowLog() (string, error) {
	sql := fmt.Sprintf(`select count(*) from
    (select sum(Process_time) as sum_process_time,
         digest
    from information_schema.CLUSTER_SLOW_QUERY
    where time >= '%s'
            AND time < '%s'
			AND Is_internal = false
    group by  digest) AS t1
	where t1.digest NOT IN
    (select digest
    from information_schema.CLUSTER_SLOW_QUERY
    where time >= '%s'
            and time < '%s'
    group by  digest);`, c.startTime, c.endTime, c.referStartTime, c.referEndTime)
	rows, err := querySQL(c.db, sql)
	if err != nil {
		return "", err
	}
	if len(rows) == 0 || len(rows[0]) == 0 {
		return "", nil
	}
	count, err := strconv.Atoi(rows[0][0])
	if err != nil {
		return "", err
	}
	if count == 0 {
		return "", nil
	}
	return fmt.Sprintf(`select * from
    (select count(*),
         min(time),
         sum(query_time) AS sum_query_time,
         sum(Process_time) AS sum_process_time,
         sum(Wait_time) AS sum_wait_time,
         sum(Commit_time),
         sum(Request_count),
         sum(process_keys),
         sum(Write_keys),
         max(Cop_proc_max),
         min(query),min(prev_stmt),
         digest
    from information_schema.CLUSTER_SLOW_QUERY
    where time >= '%s'
            and time < '%s'
            and Is_internal = false
    group by  digest) AS t1
	where t1.digest NOT IN
    (select digest
    from information_schema.CLUSTER_SLOW_QUERY
    where time >= '%s'
            AND time < '%s'
    group by  digest)
	order by  t1.sum_query_time desc limit 10;`, c.startTime, c.endTime, c.referStartTime, c.referEndTime), nil
}

func (c *clusterInspection) queryExpensiveQueryInTiDBLog() (string, error) {
	sql := fmt.Sprintf(`select count(*) from information_schema.cluster_log where type='tidb' and time >= '%s' and time < '%s' and level = 'warn' and message LIKE '%s'`,
		c.startTime, c.endTime, "%expensive_query%")
	rows, err := querySQL(c.db, sql)
	if err != nil {
		return "", err
	}
	if len(rows) == 0 || len(rows[0]) == 0 {
		return "", nil
	}
	count, err := strconv.Atoi(rows[0][0])
	if err != nil {
		return "", err
	}
	if count == 0 {
		return "", nil
	}
	sql = strings.Replace(sql, "count(*)", "*", 1)
	return sql, nil
}

func batchAtof(ss []string) ([]float64, error) {
	re := make([]float64, len(ss))
	for i := range ss {
		v, err := strconv.ParseFloat(ss[i], 64)
		if err != nil {
			return nil, err
		}
		re[i] = v
	}
	return re, nil
}

func batchAtoi(ss []string) ([]int, error) {
	re := make([]int, len(ss))
	for i := range ss {
		v, err := strconv.ParseFloat(ss[i], 64)
		if err != nil {
			return nil, err
		}
		re[i] = int(math.Round(v))
	}
	return re, nil
}

func calculateDiff(refer float64, check float64) float64 {
	if refer != 0 {
		return check / refer
	}
	return check
}

type metricDiff struct {
	tp    string
	label string
	ratio float64
	rv    float64
	v     float64
}

func newMetricDiff(tp, label string, refer, check float64) metricDiff {
	return metricDiff{
		tp:    tp,
		label: label,
		ratio: calculateDiff(refer, check),
		rv:    refer,
		v:     check,
	}
}

func (d metricDiff) String() string {
	if d.ratio > 1 {
		return fmt.Sprintf("%s,%s: ↑ %.2f (%.2f / %.2f)", d.tp, d.label, d.ratio, d.v, d.rv)
	}
	return fmt.Sprintf("%s,%s: ↓ %.2f (%.2f / %.2f)", d.tp, d.label, d.ratio, d.v, d.rv)
}

type compareType bool

const (
	compareLT compareType = false
	compareGT compareType = true
)

func checkDiffs(diffs []metricDiff, tp compareType, threshold float64) []metricDiff {
	var result []metricDiff
	for i := range diffs {
		switch tp {
		case compareLT:
			if diffs[i].ratio < threshold {
				result = append(result, diffs[i])
			}
		case compareGT:
			if diffs[i].ratio > threshold {
				result = append(result, diffs[i])
			}
		}
	}
	return result
}

func genMetricDiffsString(diffs []metricDiff) []string {
	ss := make([]string, 0, len(diffs))
	for i := range diffs {
		ss = append(ss, diffs[i].String())
	}
	return ss
}
