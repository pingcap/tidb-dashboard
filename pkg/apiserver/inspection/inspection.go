package inspection

import (
	"bytes"
	"fmt"
	"github.com/jinzhu/gorm"
	"math"
	"strconv"
	"strings"
)

type clusterInspection struct {
	referStartTime string
	referEndTime   string
	startTime      string
	endTime        string

	db *gorm.DB
}

func (c *clusterInspection) inspectForAffectByBigQuery() (*inspectionResult, error) {
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
			threshold: 0.90,
		},
		{
			query: &queryDuration{
				baseQuery: baseQuery{
					table:     "tidb_query_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct: compareGT,
			//threshold: 1.5,
			threshold: 1.2,
		},
		{
			query: &queryDuration{
				baseQuery: baseQuery{
					table:     "tidb_cop_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct: compareGT,
			//threshold: 2,
			threshold: 1.5,
		},
		//{
		//	query: &queryTotal{
		//		baseQuery: baseQuery{
		//			table:     "tikv_futurepool_handled_tasks_total_num",
		//			labels:    []string{"instance"},
		//			condition: "name like 'cop%'",
		//		},
		//	},
		//	ct:        compareGT,
		//	threshold: 1.0,
		//},
		{
			query: &queryTotal{
				baseQuery: baseQuery{
					table:  "tikv_cop_scan_details_total",
					labels: []string{"instance"},
				},
			},
			ct:        compareGT,
			threshold: 2.0,
		},
		{
			query: &queryDuration{
				baseQuery: baseQuery{
					table:     "tikv_cop_handle_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 2.0,
		},
		{
			query: &queryDuration{
				baseQuery: baseQuery{
					table:     "tikv_cop_wait_duration",
					labels:    []string{"instance"},
					condition: "value is not null and quantile=0.999",
				},
			},
			ct:        compareGT,
			threshold: 1.1,
		},
	}
	var totalDiffs []metricDiff
	for _, ck := range checks {
		err := c.compareMetric(ck.query)
		if err != nil {
			return nil, err
		}
		partDiffs := ck.query.compare()
		partDiffs = checkDiffs(partDiffs, ck.ct, ck.threshold)
		if len(partDiffs) == 0 {
			return nil, nil
		}
		totalDiffs = append(totalDiffs, partDiffs...)
	}
	detailSQL, err := c.queryBigQueryInSlowLog()
	if err != nil {
		return nil, err
	}
	detail := genMetricDiffsString(totalDiffs)
	if len(detailSQL) > 0 {
		detail = detail + " ,has big query been execute in diagnose time range, " + "check the big query with sql: \n" + detailSQL
	}
	result := &inspectionResult{
		detail: detail,
	}
	fmt.Println(detail)
	return result, nil
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
	var diffs []metricDiff
	for label, v := range s.current {
		rv, ok := s.refer[label]
		if !ok {
			continue
		}
		diff := metricDiff{
			tp:    s.table,
			label: label,
			ratio: calculateDiff(float64(rv.avg), float64(v.avg)),
		}
		diffs = append(diffs, diff)
		printDiff("query-qps", label, "avg", float64(rv.avg), float64(v.avg))
		printDiff("query-qps", label, "max", float64(rv.max), float64(v.max))
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

type queryArg struct {
	startTime string
	endTime   string
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

type queryDuration struct {
	baseQuery
	result  map[string]durationValue
	refer   map[string]durationValue
	current map[string]durationValue
}

type durationValue struct {
	avg float64
	max float64
}

func (s *queryDuration) init() {
	s.result = make(map[string]durationValue)
}

func (s *queryDuration) setRefer() {
	s.refer = s.result
	s.result = nil
}
func (s *queryDuration) setCurrent() {
	s.current = s.result
	s.result = nil
}

func (s *queryDuration) compare() []metricDiff {
	var diffs []metricDiff
	for label, v := range s.current {
		rv, ok := s.refer[label]
		// todo, consider no label match, such as add a new tidb.
		if !ok {
			continue
		}
		diff := metricDiff{
			tp:    s.table,
			label: label,
			ratio: calculateDiff(rv.avg, v.avg),
		}
		diffs = append(diffs, diff)
		printDiff(s.table, label, "avg", float64(rv.avg), float64(v.avg))
		printDiff(s.table, label, "max", float64(rv.max), float64(v.max))
	}
	return diffs
}

func (s *queryDuration) getDiff() []metricDiff {
	var diffs []metricDiff
	for label, v := range s.current {
		rv, ok := s.refer[label]
		// todo, consider no label match, such as add a new tidb.
		if !ok {
			continue
		}
		diff := metricDiff{
			tp:    s.table,
			label: label,
			ratio: calculateDiff(rv.avg, v.avg),
		}
		diffs = append(diffs, diff)
		printDiff(s.table, label, "avg", float64(rv.avg), float64(v.avg))
		printDiff(s.table, label, "max", float64(rv.max), float64(v.max))
	}
	return diffs
}

func (s *queryDuration) generateSQL(arg *queryArg) string {
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	sql := fmt.Sprintf("select `%[1]s`, avg(value),max(value) from metrics_schema.%[2]s %[3]s group by `%[1]s`",
		strings.Join(s.labels, "`,`"), s.table, s.genCondition(arg))
	sql = prepareSQL + sql
	//fmt.Println(sql)
	return sql
}

func (s *queryDuration) appendRow(row []string) error {
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
	var diffs []metricDiff

	for label, v := range s.current {
		rv, ok := s.refer[label]
		if !ok {
			continue
		}
		diff := metricDiff{
			tp:    s.table,
			label: label,
			ratio: calculateDiff(float64(rv), float64(v)),
		}
		diffs = append(diffs, diff)
		printDiff(s.table, label, "sum", float64(rv), float64(v))
	}
	return diffs
}

func (s *queryTotal) generateSQL(arg *queryArg) string {
	prepareSQL := "set @@tidb_metric_query_step=60;set @@tidb_metric_query_range_duration=60;"
	sql := fmt.Sprintf("select `%[1]s`, sum(value) as total from metrics_schema.%[2]s %[3]s group by `%[1]s` having total > 0",
		strings.Join(s.labels, "`,`"), s.table, s.genCondition(arg))
	//fmt.Println(sql)
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
	sql := fmt.Sprintf(`SELECT count(*)
FROM 
    (SELECT sum(Process_time) AS sum_process_time,
         digest
    FROM information_schema.CLUSTER_SLOW_QUERY
    WHERE time >= '%s'
            AND time < '%s'
            AND is_internal=false
            AND process_keys > 1000
            AND request_count > 5
            AND process_time > 0.5
    GROUP BY  digest) AS t1
WHERE t1.digest NOT IN 
    (SELECT digest
    FROM information_schema.CLUSTER_SLOW_QUERY
    WHERE time >= '%s'
            AND time < '%s'
    GROUP BY  digest);`, c.startTime, c.endTime, c.referStartTime, c.referEndTime)
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
	return fmt.Sprintf(`SELECT * FROM 
    (SELECT count(*),
         min(time),
         sum(query_time) AS sum_query_time,
         sum(Process_time) AS sum_process_time,
         sum(Wait_time) AS sum_wait_time,
         sum(Request_count),
         sum(process_keys),
         max(Cop_proc_max),
         min(query),
         digest
    FROM information_schema.CLUSTER_SLOW_QUERY
    WHERE time >= '%s'
            AND time < '%s'
            AND is_internal=false
            AND process_keys > 1000
            AND request_count > 5
            AND process_time > 0.5
    GROUP BY  digest) AS t1
WHERE t1.digest NOT IN 
    (SELECT digest
    FROM information_schema.CLUSTER_SLOW_QUERY
    WHERE time >= '%s'
            AND time < '%s'
    GROUP BY  digest)
ORDER BY  t1.sum_process_time DESC limit 10;`, c.startTime, c.endTime, c.referStartTime, c.referEndTime), nil
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

func querySQL(db *gorm.DB, sql string) ([][]string, error) {
	if len(sql) == 0 {
		return nil, nil
	}

	rows, err := db.Raw(sql).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	// Read all rows.
	resultRows := make([][]string, 0, 2)
	for rows.Next() {
		cols, err1 := rows.Columns()
		if err1 != nil {
			return nil, err
		}

		rawResult := make([][]byte, len(cols))
		dest := make([]interface{}, len(cols))
		for i := range rawResult {
			dest[i] = &rawResult[i]
		}

		err1 = rows.Scan(dest...)
		if err1 != nil {
			return nil, err
		}

		resultRow := []string{}
		for _, raw := range rawResult {
			val := ""
			if raw != nil {
				val = string(raw)
			}

			resultRow = append(resultRow, val)
		}
		resultRows = append(resultRows, resultRow)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return resultRows, nil
}

func calculateDiff(refer float64, check float64) float64 {
	return float64(check) / float64(refer)
}

func printDiff(item, label, tp string, refer, now float64) {
	fmt.Printf("%s: %s: refer: %.3f, now: %.3f, %s diff: : %.2f\n", item, label, refer, now, tp, calculateDiff(refer, now))
}

type inspectionResult struct {
	tp       string
	instance string
	// represents the diagnostics item, e.g: `ddl.lease` `raftstore.cpuusage`
	item string
	// diagnosis result value base on current cluster status
	actual   string
	expected string
	severity string
	detail   string
}

type metricDiff struct {
	tp    string
	label string
	ratio float64
}

func (d metricDiff) String() string {
	return d.tp + "|" + d.label + "|" + fmt.Sprintf("%.2f", d.ratio)
}

type compareType bool

const (
	compareLT = false
	compareGT = true
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

func genMetricDiffsString(diffs []metricDiff) string {
	var buf bytes.Buffer
	for i := range diffs {
		if i > 0 {
			buf.WriteString(" -> " + diffs[i].String())
		} else {
			buf.WriteString(diffs[i].String())
		}
	}
	return buf.String()
}
