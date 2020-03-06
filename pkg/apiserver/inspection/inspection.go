package inspection

import (
	"fmt"
	"github.com/jinzhu/gorm"
	"math"
	"strconv"
)

type clusterInspection struct {
	referStartTime string
	referEndTime   string
	startTime      string
	endTime        string

	db *gorm.DB
}

func (c *clusterInspection) getTiDBQueryQPS() error {
	query := queryQPS{
		table:  "tidb_qps",
		labels: []string{"instance"},
	}
	arg := &queryArg{
		startTime: c.referStartTime,
		endTime:   c.referEndTime,
	}
	referQPS, err := query.queryResult(arg, c.db)
	if err != nil {
		return err
	}

	arg.startTime = c.startTime
	arg.endTime = c.endTime
	qps, err := query.queryResult(arg, c.db)
	if err != nil {
		return err
	}

	for label, vs := range qps.valueByLabel {
		referVs, ok := referQPS.valueByLabel[label]
		if !ok {
			continue
		}
		for _, v := range vs {
			for _, rv := range referVs {
				if v.label == rv.label {
					printDiff("query-qps", v.label, "avg", float64(rv.avg), float64(v.avg))
					printDiff("query-qps", v.label, "max", float64(rv.max), float64(v.max))
					break
				}
			}
		}
	}
	return nil
}

func printDiff(item, label, tp string, refer, now float64) {
	fmt.Printf("%s: %s: refer: %.3f, now: %.3f, %s diff: : %.2f\n", item, label, refer, now, tp, calculateDiff(refer, now))
}

func (c *clusterInspection) getTiDBQueryDuration() error {
	query := queryDuration{
		table:     "tidb_query_duration",
		labels:    []string{"instance"},
		condition: "value is not null and quantile=0.999",
	}
	arg := &queryArg{
		startTime: c.referStartTime,
		endTime:   c.referEndTime,
	}
	referDuration, err := query.queryResult(arg, c.db)
	if err != nil {
		return err
	}

	arg.startTime = c.startTime
	arg.endTime = c.endTime
	duratoin, err := query.queryResult(arg, c.db)
	if err != nil {
		return err
	}

	for label, vs := range duratoin.valueByLabel {
		referVs, ok := referDuration.valueByLabel[label]
		if !ok {
			continue
		}
		for _, v := range vs {
			for _, rv := range referVs {
				if v.label == rv.label {
					printDiff("query-duration", v.label, "avg", float64(rv.avg), float64(v.avg))
					printDiff("query-duration", v.label, "max", float64(rv.max), float64(v.max))
					break
				}
			}
		}
	}
	return nil
}

func calculateDiff(refer float64, check float64) float64 {
	return float64(check) / float64(refer)
}

type qpsResult struct {
	valueByLabel map[string][]avgMaxMin
}

type avgMaxMin struct {
	label string
	avg   int
	max   int
	min   int
}

type queryQPS struct {
	table     string
	labels    []string
	condition string
}

type queryArg struct {
	startTime string
	endTime   string
}

func (s queryQPS) queryResult(arg *queryArg, db *gorm.DB) (qpsResult, error) {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", arg.startTime, arg.endTime)
	if len(s.condition) > 0 {
		condition = condition + "and " + s.condition
	}
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	result := qpsResult{valueByLabel: make(map[string][]avgMaxMin, len(s.labels))}
	for _, label := range s.labels {
		sql := fmt.Sprintf("select t1.label, avg(value),max(value),min(value) from (select `%[3]v` as label, sum(value) as value from metrics_schema.%[1]s %[2]s group by `%[3]s`,time) as t1 group by t1.label having avg(value)>0",
			s.table, condition, label)
		sql = prepareSQL + sql
		//fmt.Println(sql)
		rows, err := querySQL(db, sql)
		if err != nil {
			return result, err
		}
		for _, row := range rows {
			values, err := batchAtoi(row[1:])
			if err != nil {
				return result, err
			}
			result.valueByLabel[label] = append(result.valueByLabel[label], avgMaxMin{
				label: row[0],
				avg:   values[0],
				max:   values[1],
				min:   values[2],
			})

		}
	}
	return result, nil
}

type durationResult struct {
	valueByLabel map[string][]durationValue
}

type durationValue struct {
	label string

	avg float64
	max float64
}

type queryDuration struct {
	table     string
	labels    []string
	condition string
}

func (s queryDuration) queryResult(arg *queryArg, db *gorm.DB) (durationResult, error) {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", arg.startTime, arg.endTime)
	if len(s.condition) > 0 {
		condition = condition + "and " + s.condition
	}
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	result := durationResult{valueByLabel: make(map[string][]durationValue, len(s.labels))}
	for _, label := range s.labels {
		sql := fmt.Sprintf("select `%[1]s` as label, avg(value),max(value) from metrics_schema.%[2]s %[3]s group by `%[1]s`",
			label, s.table, condition)
		sql = prepareSQL + sql
		rows, err := querySQL(db, sql)
		if err != nil {
			return result, err
		}
		for _, row := range rows {
			values, err := batchAtof(row[1:])
			if err != nil {
				return result, err
			}
			result.valueByLabel[label] = append(result.valueByLabel[label], durationValue{
				label: row[0],
				avg:   values[0],
				max:   values[1],
			})

		}
	}
	return result, nil
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

		// See https://stackoverflow.com/questions/14477941/read-select-columns-into-string-in-go
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
