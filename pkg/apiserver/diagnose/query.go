// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

type rowQuery interface {
	queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error)
}

type queryArg struct {
	totalTime float64
	startTime string
	endTime   string
	quantiles []float64
}

func newQueryArg(startTime, endTime string) *queryArg {
	return &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: []float64{0.999, 0.99, 0.90, 0.80},
	}
}

type AvgMaxMinTableDef struct {
	name      string
	tbl       string
	condition string
	labels    []string
	Comment   string
}

// Table schema
// METRIC_NAME , LABEL, AVG(VALUE), MAX(VALUE), MIN(VALUE),.
func (t AvgMaxMinTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	if len(t.name) == 0 {
		t.name = t.tbl
	}
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		condition = condition + "and " + t.condition
	}
	sql := fmt.Sprintf("select '%s', '', avg(value), max(value), min(value) from metrics_schema.%s %s",
		t.name, t.tbl, condition)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	if len(t.labels) == 0 {
		return t.genRow(rows[0], nil), nil
	}

	sql = fmt.Sprintf("select '%[1]s',`%[2]v`, avg(value), max(value), min(value) from metrics_schema.%[3]v %[4]s group by `%[2]v` order by avg(value) desc",
		t.name, strings.Join(t.labels, "`,`"), t.tbl, condition)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	for i := range subRows {
		row := subRows[i]
		row[1] = strings.Join(row[1:1+len(t.labels)], ",")
		newRow := row[:2]
		newRow = append(newRow, row[1+len(t.labels):]...)
		subRows[i] = newRow
	}
	return t.genRow(rows[0], subRows), nil
}

func (t AvgMaxMinTableDef) genRow(values []string, subValues [][]string) *TableRowDef {
	specialHandle := func(row []string) []string {
		if len(row) == 0 {
			return row
		}
		row[2] = RoundFloatString(row[2])
		row[3] = RoundFloatString(row[3])
		row[4] = RoundFloatString(row[4])
		return row
	}

	values = specialHandle(values)
	for i := range subValues {
		subValues[i] = specialHandle(subValues[i])
	}

	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   t.Comment,
	}
}

type sumValueQuery struct {
	name      string
	tbl       string
	condition string
	labels    []string
	comment   string
}

// Table schema
// METRIC_NAME , LABEL  TOTAL_VALUE.
func (t sumValueQuery) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	if len(t.name) == 0 {
		t.name = t.tbl
	}
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		condition = condition + "and " + t.condition
	}
	sql := fmt.Sprintf("select '%s', '', sum(value) from metrics_schema.%s %s",
		t.name, t.tbl, condition)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	if len(t.labels) == 0 {
		return t.genRow(rows[0], nil), nil
	}

	sql = fmt.Sprintf("select '%[1]v',`%[2]v`, sum(value) from metrics_schema.%[3]v %[4]s group by `%[2]v` having sum(value) > 0 order by sum(value) desc",
		t.name, strings.Join(t.labels, "`,`"), t.tbl, condition)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	for i := range subRows {
		row := subRows[i]
		row[1] = strings.Join(row[1:1+len(t.labels)], ",")
		newRow := row[:2]
		newRow = append(newRow, row[1+len(t.labels):]...)
		subRows[i] = newRow
	}
	return t.genRow(rows[0], subRows), nil
}

func (t sumValueQuery) genRow(values []string, subValues [][]string) *TableRowDef {
	specialHandle := func(row []string) []string {
		if len(row) == 0 {
			return row
		}
		row[2] = RoundFloatString(row[2])
		return row
	}

	values = specialHandle(values)
	for i := range subValues {
		subValues[i] = specialHandle(subValues[i])
	}
	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}
}

type totalTimeByLabelsTableDef struct {
	name    string
	tbl     string
	labels  []string
	comment string
}

// Table schema
// METRIC_NAME , LABEL , TIME_RATIO ,  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80.
func (t totalTimeByLabelsTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	sql := t.genSumarySQLs(arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	if len(t.labels) == 0 {
		return t.genRow(rows[0], nil), nil
	}

	if arg.totalTime == 0 && len(rows[0][3]) > 0 {
		totalTime, err := strconv.ParseFloat(rows[0][3], 64)
		if err == nil {
			arg.totalTime = totalTime
		}
	}

	sql = t.genDetailSQLs(arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}

	for i := range subRows {
		row := subRows[i]
		row[1] = strings.Join(row[1:1+len(t.labels)], ",")
		newRow := row[:2]
		newRow = append(newRow, row[1+len(t.labels):]...)
		subRows[i] = newRow
	}
	return t.genRow(rows[0], subRows), nil
}

func (t totalTimeByLabelsTableDef) genRow(values []string, subValues [][]string) *TableRowDef {
	specialHandle := func(row []string) []string {
		if len(row) == 0 {
			return row
		}
		name := row[0]
		if strings.HasSuffix(name, "(us)") {
			if len(row[3]) == 0 {
				return row
			}
			for _, i := range []int{2, 3, 5, 6, 7, 8} {
				v, err := strconv.ParseFloat(row[i], 64)
				if err == nil {
					row[i] = fmt.Sprintf("%f", v/10e5)
				}
			}
			row[0] = name[:len(name)-4]
		}
		if len(row[4]) > 0 {
			row[4] = convertFloatToInt(row[4])
		}
		for _, i := range []int{2, 3, 5, 6, 7, 8} {
			row[i] = RoundFloatString(row[i])
		}
		return row
	}

	values = specialHandle(values)
	for i := range subValues {
		subValues[i] = specialHandle(subValues[i])
	}

	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}
}

func (t totalTimeByLabelsTableDef) genSumarySQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
	sqls := []string{
		fmt.Sprintf("select '%[1]s','', if(%[2]v>0,sum(value)/%[2]v,1) , sum(value) from metrics_schema.%[3]s_total_time where time >= '%[4]s' and time < '%[5]s'",
			t.name, totalTime, t.tbl, startTime, endTime),
		fmt.Sprintf("select sum(value) from metrics_schema.%s_total_count where time >= '%s' and time < '%s'",
			t.tbl, startTime, endTime),
	}
	for _, quantile := range quantiles {
		sql := fmt.Sprintf("select max(value) as max_value from metrics_schema.%s_duration where time >= '%s' and time < '%s' and quantile=%f",
			t.tbl, startTime, endTime, quantile)
		sqls = append(sqls, sql)
	}
	fields := ""
	tbls := ""
	for i, sql := range sqls {
		if i > 0 {
			fields += ","
			tbls += "join "
		}
		fields += fmt.Sprintf("t%v.*", i)
		tbls += fmt.Sprintf(" (%s) as t%v ", sql, i)
	}
	joinSQL := fmt.Sprintf("select %v from %v", fields, tbls)
	return joinSQL
}

func (t totalTimeByLabelsTableDef) genDetailSQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
	if len(t.labels) == 0 {
		return ""
	}
	joinSQL := "select t0.*,t1.total_count"
	sqls := []string{
		fmt.Sprintf("select '%[1]s', `%[6]s`, if(%[2]v>0,sum(value)/%[2]v,1) , sum(value) as total from metrics_schema.%[3]s_total_time where time >= '%[4]s' and time < '%[5]s' group by `%[6]s` having sum(value) > 0",
			t.name, totalTime, t.tbl, startTime, endTime, strings.Join(t.labels, "`,`")),

		fmt.Sprintf("select `%[4]s`, sum(value) as total_count from metrics_schema.%[1]s_total_count where time >= '%[2]s' and time < '%[3]s' group by `%[4]s`",
			t.tbl, startTime, endTime, strings.Join(t.labels, "`,`")),
	}
	for i, quantile := range quantiles {
		sql := fmt.Sprintf("select `%[5]s`, max(value) as max_value from metrics_schema.%[1]s_duration where time >= '%[2]s' and time < '%[3]s' and quantile=%[4]f group by `%[5]s`",
			t.tbl, startTime, endTime, quantile, strings.Join(t.labels, "`,`"))
		sqls = append(sqls, sql)
		joinSQL += fmt.Sprintf(",t%v.max_value", i+2)
	}
	joinSQL += " from "
	for i, sql := range sqls {
		joinSQL += fmt.Sprintf(" (%s) as t%v ", sql, i)
		if i != len(sqls)-1 {
			joinSQL += "join "
		}
	}
	joinSQL += " where "
	for i := 0; i < len(sqls)-1; i++ {
		for j, label := range t.labels {
			if i > 0 || j > 0 {
				joinSQL += "and "
			}
			joinSQL += fmt.Sprintf(" t%v.%s = t%v.%s ", i, label, i+1, label)
		}
	}
	joinSQL += " order by t0.total desc"
	return joinSQL
}

type totalValueAndTotalCountTableDef struct {
	name     string
	tbl      string
	sumTbl   string
	countTbl string
	labels   []string
	comment  string
}

// Table schema
// METRIC_NAME , LABEL  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80.
func (t totalValueAndTotalCountTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	sql := t.genSumarySQLs(arg.startTime, arg.endTime, arg.quantiles)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	if len(t.labels) == 0 {
		return t.genRow(rows[0], nil), nil
	}
	sql = t.genDetailSQLs(arg.startTime, arg.endTime, arg.quantiles)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	for i := range subRows {
		row := subRows[i]
		row[1] = strings.Join(row[1:1+len(t.labels)], ",")
		newRow := row[:2]
		newRow = append(newRow, row[1+len(t.labels):]...)
		subRows[i] = newRow
	}
	return t.genRow(rows[0], subRows), nil
}

func (t totalValueAndTotalCountTableDef) genRow(values []string, subValues [][]string) *TableRowDef {
	specialHandle := func(row []string) []string {
		for i := 2; i < len(row); i++ {
			if len(row[i]) == 0 {
				continue
			}
			row[i] = convertFloatToInt(row[i])
		}
		return row
	}

	values = specialHandle(values)
	for i := range subValues {
		subValues[i] = specialHandle(subValues[i])
	}

	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}
}

func (t totalValueAndTotalCountTableDef) genSumarySQLs(startTime, endTime string, quantiles []float64) string {
	sqls := []string{
		fmt.Sprintf("select '%[1]s','' , sum(value) from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s'",
			t.name, t.sumTbl, startTime, endTime),
		fmt.Sprintf("select sum(value) from metrics_schema.%s where time >= '%s' and time < '%s'",
			t.countTbl, startTime, endTime),
	}
	for _, quantile := range quantiles {
		sql := fmt.Sprintf("select max(value) as max_value from metrics_schema.%s where time >= '%s' and time < '%s' and quantile=%f",
			t.tbl, startTime, endTime, quantile)
		sqls = append(sqls, sql)
	}
	fields := ""
	tbls := ""
	for i, sql := range sqls {
		if i > 0 {
			fields += ","
			tbls += "join "
		}
		fields += fmt.Sprintf("t%v.*", i)
		tbls += fmt.Sprintf(" (%s) as t%v ", sql, i)
	}
	joinSQL := fmt.Sprintf("select %v from %v", fields, tbls)
	return joinSQL
}

func (t totalValueAndTotalCountTableDef) genDetailSQLs(startTime, endTime string, quantiles []float64) string {
	if len(t.labels) == 0 {
		return ""
	}
	joinSQL := "select t0.*,t1.count"
	sqls := []string{
		fmt.Sprintf("select '%[1]s', `%[5]s` , sum(value) as total from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' group by `%[5]s` having sum(value) > 0",
			t.name, t.sumTbl, startTime, endTime, strings.Join(t.labels, "`,`")),
		fmt.Sprintf("select `%[4]s`, sum(value) as count from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s' group by `%[4]s`",
			t.countTbl, startTime, endTime, strings.Join(t.labels, "`,`")),
	}
	for i, quantile := range quantiles {
		sql := fmt.Sprintf("select `%[5]s`, max(value) as max_value from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s' and quantile=%[4]f group by `%[5]s`",
			t.tbl, startTime, endTime, quantile, strings.Join(t.labels, "`,`"))
		sqls = append(sqls, sql)
		joinSQL += fmt.Sprintf(",t%v.max_value", i+2)
	}
	joinSQL += " from "
	for i, sql := range sqls {
		joinSQL += fmt.Sprintf(" (%s) as t%v ", sql, i)
		if i != len(sqls)-1 {
			joinSQL += "join "
		}
	}
	joinSQL += " where "
	for i := 0; i < len(sqls)-1; i++ {
		for j, label := range t.labels {
			if i > 0 || j > 0 {
				joinSQL += "and "
			}
			joinSQL += fmt.Sprintf(" t%v.%s = t%v.%s ", i, label, i+1, label)
		}
	}
	joinSQL += " order by t0.total desc"
	return joinSQL
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

func convertFloatToInt(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	f = math.Round(f)
	return fmt.Sprintf("%.0f", f)
}

func convertFloatToSize(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	if mb := f / float64(1024*1024*1024); mb > 1 {
		f = math.Round(mb*1000) / 1000
		return fmt.Sprintf("%.3f GB", f)
	}
	if mb := f / float64(1024*1024); mb > 1 {
		f = math.Round(mb*1000) / 1000
		return fmt.Sprintf("%.3f MB", f)
	}
	kb := f / float64(1024)
	f = math.Round(kb*1000) / 1000
	return fmt.Sprintf("%.3f KB", f)
}

func convertFloatToDuration(s string, ratio float64) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	f = f * ratio
	if f > 10 {
		f = math.Round(f*1000) / 1000
		return fmt.Sprintf("%.0f s", f)
	}
	if ms := f * 1000; ms > 10 {
		f = math.Round(ms*1000) / 1000
		return fmt.Sprintf("%.0f ms", f)
	}
	us := f * 1000 * 1000
	f = math.Round(us*1000) / 1000
	return fmt.Sprintf("%.0f us", f)
}

func convertFloatToSizeByRows(rows []TableRowDef, idx int) {
	for i := range rows {
		convertFloatToSizeByRow(&rows[i], idx)
	}
}

func convertFloatToSizeByRow(row *TableRowDef, idx int) {
	if len(row.Values) < (idx + 1) {
		return
	}
	row.Values[idx] = convertFloatToSize(row.Values[idx])
	for j := range row.SubValues {
		if len(row.SubValues[j]) < (idx + 1) {
			continue
		}
		row.SubValues[j][idx] = convertFloatToSize(row.SubValues[j][idx])
	}
}

func RoundFloatString(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	return convertFloatToString(f)
}

func convertFloatToString(f float64) string {
	if f == 0 {
		return "0"
	}
	sign := float64(1)
	if f < 0 {
		sign = -1
		f = 0 - f
	}
	tmp := f
	n := 2
	for {
		if tmp > 0.01 {
			break
		}
		tmp = tmp * 10
		n++
		if n > 15 {
			break
		}
	}

	value := math.Pow10(n)
	f = math.Round(f*value) / value

	format := `%.` + strconv.FormatInt(int64(n), 10) + `f`
	str := fmt.Sprintf(format, f*sign)
	if strings.Contains(str, ".") {
		for strings.HasSuffix(str, "0") {
			str = str[:len(str)-1]
		}
	}
	if strings.HasSuffix(str, ".") {
		return str[:len(str)-1]
	}
	return str
}

func genComment(comment string, labels []string) string {
	if len(labels) > 0 {
		if len(comment) > 0 {
			comment += ","
		}
		comment = fmt.Sprintf("%s the label is [%s]", comment, strings.Join(labels, ", "))
	}
	return comment
}

func sortRowsByIndex(resultRows []TableRowDef, idx int) {
	// sort sub rows.
	for j := range resultRows {
		subValues := resultRows[j].SubValues
		sort.Slice(subValues, func(i, j int) bool {
			if len(subValues[i]) < (idx+1) || len(subValues[j]) < (idx+1) {
				return false
			}
			v1, err1 := parseFloat(subValues[i][idx])
			v2, err2 := parseFloat(subValues[j][idx])
			if err1 != nil || err2 != nil {
				return false
			}
			return v1 > v2
		})
		resultRows[j].SubValues = subValues
	}
	sort.Slice(resultRows, func(i, j int) bool {
		if len(resultRows[i].Values) < (idx+1) || len(resultRows[j].Values) < (idx+1) {
			return false
		}
		v1, err1 := parseFloat(resultRows[i].Values[idx])
		v2, err2 := parseFloat(resultRows[j].Values[idx])
		if err1 != nil || err2 != nil {
			return false
		}
		return v1 > v2
	})
}
