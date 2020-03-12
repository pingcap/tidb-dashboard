// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package diagnose

import (
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/jinzhu/gorm"
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
	label     string
	Comment   string
}

// Table schema
// METRIC_NAME , LABEL, AVG(VALUE), MAX(VALUE), MIN(VALUE),
func (t AvgMaxMinTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	if len(t.name) == 0 {
		t.name = t.tbl
	}
	fields := fmt.Sprintf(`
		'%s' as name,
		'' as label,
		avg(value) as avg, 
		max(value) as max, 
		min(value) as min
		`, t.name)
	table := fmt.Sprintf("metrics_schema.%s", t.tbl)
	query := db.
		Select(fields).
		Table(table).
		Where("time >= ? AND time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}
	rows, err := query.Rows()
	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	if len(t.label) == 0 {
		return t.genRow(results[0], nil), nil
	}


	label := "`" + t.label + "`"
	fields = fmt.Sprintf(`
		'%s' as name,
		%s as label,
		avg(value) as avg, 
		max(value) as max, 
		min(value) as min
		`, t.name, label)
	query = db.
		Select(fields).
		Table(table).
		Where("time >= ? AND time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}
	rows, err = query.
		Group(label).
		Order("avg(value) desc").
		Rows()
	if err != nil {
		return nil, err
	}
	subResults, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	return t.genRow(results[0], subResults), nil
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
// METRIC_NAME , LABEL  TOTAL_VALUE
func (t sumValueQuery) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	if len(t.name) == 0 {
		t.name = t.tbl
	}
	fields := fmt.Sprintf(`
		'%s' as name, 
		'' as label,
		sum(value) as sum
		`, t.name)
	table := fmt.Sprintf("metrics_schema.%s", t.tbl)

	query := db.
		Select(fields).
		Table(table).
		Where("time >= ? AND time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}
	rows, err := query.Rows()
	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	if len(t.labels) == 0 {
		return t.genRow(results[0], nil), nil
	}

	labelFields := fmt.Sprintf("`%v`", strings.Join(t.labels, "`||','||`"))
	fields = fmt.Sprintf(`
		'%s' as name, 
		%s as label, 
		sum(value) as sum
		`, t.name, labelFields)
	table = fmt.Sprintf("metrics_schema.%v", t.tbl)
	groupSql := fmt.Sprintf("`%v`", strings.Join(t.labels, "`,`"))

	query = db.
		Select(fields).
		Table(table).
		Where("time >= ? AND time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}
	rows, err  = query.
		Group(groupSql).
		Having("sum(value) > 0").
		Order("sum(value) desc").
		Rows()
	if err != nil {
		return nil, err
	}
	subResults, err := scanRows(rows)
	if err != nil {
		return nil, err
	}

	return t.genRow(results[0], subResults), nil
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
// METRIC_NAME , LABEL , TIME_RATIO ,  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80
func (t totalTimeByLabelsTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	rows, err := t.querySummary(db, arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	if len(t.labels) == 0 {
		return t.genRow(rows, nil), nil
	}

	if arg.totalTime == 0 && len(rows[3]) > 0 {
		totalTime, err := strconv.ParseFloat(rows[3], 64)
		if err == nil {
			arg.totalTime = totalTime
		}
	}

	subRows, err := t.queryDetail(db, arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	return t.genRow(rows, subRows), nil
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

func (t totalTimeByLabelsTableDef) querySummary(db *gorm.DB, totalTime float64, startTime, endTime string, quantiles []float64) ([]string, error) {
	ratioSumValueField := "'1'"
	if totalTime > 0 {
		ratioSumValueField = fmt.Sprintf("sum(t0.value)/%v", totalTime)
	}
	fields := fmt.Sprintf(`
		'%s' as name,
		'' as label,
		%s as ratioSumValue, 
		sum(t0.value) as totalTime,
		sum(t1.value) as totalCount
		`,
		t.name, ratioSumValueField)

	tables := fmt.Sprintf("metrics_schema.%s_total_time t0", t.tbl)
	tables += fmt.Sprintf(", metrics_schema.%s_total_count t1", t.tbl)
	tableNum := 2
	for range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s_duration %s", t.tbl, tableAlias)
		fields += fmt.Sprintf(", max(%v.value)", tableAlias)
		tableNum++;
	}

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)
	tableNum = 2
	for _, quantile := range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}
	rows, err := query.Rows()
	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return results[0], nil
}

func (t totalTimeByLabelsTableDef) queryDetail(db *gorm.DB, totalTime float64, startTime, endTime string, quantiles []float64) ([][]string, error) {
	if len(t.labels) == 0 {
		return nil, nil
	}
	labelFields := fmt.Sprintf("t0.`%v`", strings.Join(t.labels, "`||','||t0.`"))
	ratioSumValueField := "'1'"
	if totalTime > 0 {
		ratioSumValueField = fmt.Sprintf("sum(t0.value)/%v", totalTime)
	}
	fields := fmt.Sprintf(`
		'%s' as name,
		%s as label,
		%s as ratioSumValue,
		sum(t0.value) as totalTime,
		sum(t1.value) as totalCount
		`,
		t.name, labelFields, ratioSumValueField)

	tables := fmt.Sprintf("metrics_schema.%s_total_time t0", t.tbl)
	tables += fmt.Sprintf(", metrics_schema.%s_total_count t1", t.tbl)
	tableNum := 2
	for range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s_duration %s", t.tbl, tableAlias)
		fields += fmt.Sprintf(", max(%v.value)", tableAlias)
		tableNum++
	}

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)
	tableNum = 2
	for _, quantile := range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}

	joinSQL := ""
	for i := 0; i < tableNum-1; i++ {
		for j, label := range t.labels {
			if i > 0 || j > 0 {
				joinSQL += " and "
			}
			joinSQL += fmt.Sprintf("t%v.`%s` = t%v.`%s`", i, label, i+1, label)
		}
	}
	query = query.Where(joinSQL)
	groupSQL := "t0.`" + strings.Join(t.labels, "`, t0.`") + "`"
	orderSQL := "sum(t0.value) desc"
	rows, err := query.
		Group(groupSQL).
		Having("sum(t0.value) > 0").
		Order(orderSQL).
		Rows()
	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return results, nil
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
// METRIC_NAME , LABEL  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80
func (t totalValueAndTotalCountTableDef) queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error) {
	rows, err := t.querySummary(db, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	if len(t.labels) == 0 {
		return t.genRow(rows, nil), nil
	}

	subRows, err := t.queryDetail(db, arg.startTime, arg.endTime, arg.quantiles)
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
	return t.genRow(rows, subRows), nil
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

func (t totalValueAndTotalCountTableDef) querySummary(db *gorm.DB, startTime, endTime string, quantiles []float64) ([]string, error) {
	fields := fmt.Sprintf(`
		'%s' as name,
		'' as label,
		sum(t0.value) as totalSum,
		sum(t1.value) as totalCount
		`,
		t.name)

	tables := fmt.Sprintf("metrics_schema.%s t0", t.sumTbl)
	tables += fmt.Sprintf(", metrics_schema.%s t1", t.countTbl)
	tableNum := 2
	for range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s %s", t.tbl, tableAlias)
		fields += fmt.Sprintf(", max(%v.value)", tableAlias)
		tableNum++
	}

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)
	tableNum = 2
	for _, quantile := range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}

	rows, err := query.Rows()
	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return results[0], nil
}

func (t totalValueAndTotalCountTableDef) queryDetail(db *gorm.DB, startTime, endTime string, quantiles []float64) ([][]string, error) {
	if len(t.labels) == 0 {
		return nil, nil
	}
	labelFields := fmt.Sprintf("t0.`%v`", strings.Join(t.labels, "`||','||t0.`"))
	fields := fmt.Sprintf(`
		'%s' as name,
		%s as label,
		sum(t0.value) as totalSum,
		sum(t1.value) as totalCount
		`,
		t.name, labelFields)

	tables := fmt.Sprintf("metrics_schema.%s t0", t.sumTbl)
	tables += fmt.Sprintf(", metrics_schema.%s t1", t.countTbl)
	tableNum := 2
	for range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s %s", t.tbl, tableAlias)
		fields += fmt.Sprintf(", max(%v.value)", tableAlias)
		tableNum++
	}

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)
	tableNum = 2
	for _, quantile := range quantiles {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}

	joinSQL := ""
	for i := 0; i < tableNum-1; i++ {
		for j, label := range t.labels {
			if i > 0 || j > 0 {
				joinSQL += " and "
			}
			joinSQL += fmt.Sprintf("t%v.%s = t%v.%s", i, label, i+1, label)
		}
	}
	query = query.Where(joinSQL)

	groupSQL := "t0.`" + strings.Join(t.labels, "`, t0.`") + "`"
	orderSQL := "sum(t0.value) desc"
	rows, err := query.
		Group(groupSQL).
		Having("sum(t0.value) > 0").
		Order(orderSQL).
		Rows()

	if err != nil {
		return nil, err
	}
	results, err := scanRows(rows)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return results, nil
}

func scanRows(rows *sql.Rows) ([][]string, error) {
	defer rows.Close()
	// Read all rows.
	resultRows := make([][]string, 0, 2)
	for rows.Next() {
		cols, err := rows.Columns()
		if err != nil {
			return nil, err
		}

		// See https://stackoverflow.com/questions/14477941/read-select-columns-into-string-in-go
		rawResult := make([]string, len(cols))
		dest := make([]interface{}, len(cols))
		for i := range rawResult {
			dest[i] = &rawResult[i]
		}
		err = rows.Scan(dest...)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, rawResult)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return resultRows, nil
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

		var resultRow []string
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
	if f > 1 {
		f = math.Round(f*1000) / 1000
		return fmt.Sprintf("%.3f s", f)
	}
	if ms := f * 1000; ms > 1 {
		f = math.Round(ms*1000) / 1000
		return fmt.Sprintf("%.3f ms", f)
	}
	us := f * 1000 * 1000
	f = math.Round(us*1000) / 1000
	return fmt.Sprintf("%.3f us", f)
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