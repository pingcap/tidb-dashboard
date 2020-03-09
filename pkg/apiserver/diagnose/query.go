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
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/jinzhu/gorm"
)

type rowQuery interface {
	queryRow(arg *queryArg, db *gorm.DB) (*TableRowDef, error)
}

const QuantileNum = 4

type MaxValueOfQuantile struct {
	MaxValueOfQ1 float64
	MaxValueOfQ2 float64
	MaxValueOfQ3 float64
	MaxValueOfQ4 float64
}

type Quantiles struct {
	Q1 float64
	Q2 float64
	Q3 float64
	Q4 float64
}

type queryArg struct {
	totalTime float64
	startTime string
	endTime   string
	quantiles Quantiles
}

func newQueryArg(startTime, endTime string) *queryArg {
	return &queryArg{
		startTime: startTime,
		endTime:   endTime,
		quantiles: Quantiles{0.999, 0.99, 0.90, 0.80},
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

	row, err := t.querySummary(arg, db)
	if err != nil {
		return nil, err
	}
	values := row.toStringSlice()
	if len(t.label) == 0 {
		return &TableRowDef{
			Values:    values,
			SubValues: nil,
			Comment:   t.Comment,
		}, nil
	}

	subRows, err := t.queryDetail(arg, db)
	if err != nil {
		return nil, err
	}
	subValues := make([][]string, 0, len(subRows))
	for _, row := range subRows {
		subValues = append(subValues, row.toStringSlice())
	}

	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   t.Comment,
	}, nil
}

type AvgMaxMin struct {
	Name  string
	Label string
	Avg   float64
	Max   float64
	Min   float64
}

func (a *AvgMaxMin) toStringSlice() []string {
	return []string{
		a.Name,
		a.Label,
		convertFloatToString(a.Avg),
		convertFloatToString(a.Max),
		convertFloatToString(a.Min),
	}
}

func (t AvgMaxMinTableDef) querySummary(arg *queryArg, db *gorm.DB) (*AvgMaxMin, error) {
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

	result := &AvgMaxMin{}
	if err := query.First(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (t AvgMaxMinTableDef) queryDetail(arg *queryArg, db *gorm.DB) ([]*AvgMaxMin, error) {
	label := "`" + t.label + "`"
	fields := fmt.Sprintf(`
		'%s' as name,
		%s as label,
		avg(value) as avg, 
		max(value) as max, 
		min(value) as min
		`, t.name, label)
	table := fmt.Sprintf("metrics_schema.%s", t.tbl)

	query := db.
		Select(fields).
		Table(table).
		Where("time >= ? AND time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}

	query = query.
		Group(label).
		Order("avg(value) desc")

	var result []*AvgMaxMin
	if err := query.Find(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
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
	row, err := t.querySummary(arg, db)
	if err != nil {
		return nil, err
	}
	values := row.toStringSlice()
	if len(t.labels) == 0 {
		return &TableRowDef{
			Values:    values,
			SubValues: nil,
			Comment:   genComment(t.comment, t.labels),
		}, nil
	}

	subRows, err := t.queryDetail(arg, db)
	if err != nil {
		return nil, err
	}
	subValues := make([][]string, 0, len(subRows))
	for _, row := range subRows {
		subValues = append(subValues, row.toStringSlice())
	}

	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}, nil
}

type SumValue struct {
	Name  string
	Label string
	Sum   float64
}

func (s *SumValue) toStringSlice() []string {
	return []string{
		s.Name,
		s.Label,
		convertFloatToString(s.Sum),
	}
}

func (t sumValueQuery) querySummary(arg *queryArg, db *gorm.DB) (*SumValue, error) {
	fields := fmt.Sprintf(`
		'%s' as name, 
		'' as label,
		sum(value) as sum
		`, t.name)
	table := fmt.Sprintf("metrics_schema.%s", t.tbl)

	query := db.
		Select(fields).
		Table(table).
		Where("time >= ? and time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}

	result := &SumValue{}
	if err := query.First(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (t sumValueQuery) queryDetail(arg *queryArg, db *gorm.DB) ([]*SumValue, error) {
	labelFields := fmt.Sprintf("`%v`", strings.Join(t.labels, "`||','||`"))
	fields := fmt.Sprintf(`
		'%s' as name, 
		%s as label, 
		sum(value) as sum
		`, t.name, labelFields)
	table := fmt.Sprintf("metrics_schema.%v", t.tbl)
	groupLabels := fmt.Sprintf("`%v`", strings.Join(t.labels, "`,`"))

	query := db.
		Select(fields).
		Table(table).
		Where("time >= ? and time < ?", arg.startTime, arg.endTime)
	if len(t.condition) > 0 {
		query = query.Where(t.condition)
	}
	query = query.
		Group(groupLabels).
		Having("sum(value) > 0").
		Order("sum(value) desc")

	var result []*SumValue
	if err := query.Find(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
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
	row, err := t.querySummary(db, arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	values := row.toStringSlice()
	if len(t.labels) == 0 {
		return &TableRowDef{
			Values:    values,
			SubValues: nil,
			Comment:   genComment(t.comment, t.labels),
		}, nil
	}

	if arg.totalTime == 0 && row.TotalTime != 0.0 {
		arg.totalTime = row.TotalTime
	}

	subRows, err := t.queryDetail(db, arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	subValues := make([][]string, 0, len(subRows))
	for _, row := range subRows {
		subValues = append(subValues, row.toStringSlice())
	}
	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}, nil
}

type TotalTimeByLabels struct {
	Name          string
	Label         string
	RatioSumValue float64
	TotalTime     float64
	TotalCount    float64
	MaxValueOfQuantile
}

func (t *TotalTimeByLabels) toStringSlice() []string {
	if strings.HasSuffix(t.Name, "(us)") {
		if t.TotalTime == 0.0 {
			return []string{
				t.Name,
				t.Label,
				convertFloatToString(t.RatioSumValue),
				convertFloatToString(t.TotalTime),
				convertFloatToIntString(t.TotalCount),
				convertFloatToString(t.MaxValueOfQ1),
				convertFloatToString(t.MaxValueOfQ2),
				convertFloatToString(t.MaxValueOfQ3),
				convertFloatToString(t.MaxValueOfQ4),
			}
		}
		t.RatioSumValue /= 10e5
		t.TotalTime /= 10e5

		t.MaxValueOfQ1 /= 10e5
		t.MaxValueOfQ2 /= 10e5
		t.MaxValueOfQ3 /= 10e5
		t.MaxValueOfQ4 /= 10e5
		t.Name = t.Name[:len(t.Name)-4]
	}
	return []string{
		t.Name,
		t.Label,
		convertFloatToString(t.RatioSumValue),
		convertFloatToString(t.TotalTime),
		convertFloatToIntString(t.TotalCount),
		convertFloatToString(t.MaxValueOfQ1),
		convertFloatToString(t.MaxValueOfQ2),
		convertFloatToString(t.MaxValueOfQ3),
		convertFloatToString(t.MaxValueOfQ4),
	}
}

func (t totalTimeByLabelsTableDef) querySummary(db *gorm.DB, totalTime float64, startTime, endTime string, quantiles Quantiles) (*TotalTimeByLabels, error) {
	tables := fmt.Sprintf("metrics_schema.%s_total_time t0", t.tbl)
	tables += fmt.Sprintf(", metrics_schema.%s_total_count t1", t.tbl)
	tableNum := 2
	for ; tableNum < QuantileNum+2; tableNum++ {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s_duration %s", t.tbl, tableAlias)
	}

	ratioSumValueField := "'1'"
	if totalTime > 0 {
		ratioSumValueField = fmt.Sprintf("sum(t0.value)/%v", totalTime)
	}
	fields := fmt.Sprintf(`
		'%s' as name,
		'' as label,
		%s as ratioSumValue, 
		sum(t0.value) as totalTime
		sum(t1.value) as totalCount
		max(t2.value) as maxValueOfQ1
		max(t3.value) as maxValueOfQ2
		max(t4.value) as maxValueOfQ3
		max(t5.value) as maxValueOfQ4
		`,
		t.name, ratioSumValueField)

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)

	quantileList := []float64{quantiles.Q1, quantiles.Q2, quantiles.Q3, quantiles.Q4}
	tableNum = 2
	for _, quantile := range quantileList {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}

	result := &TotalTimeByLabels{}
	if err := query.First(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (t totalTimeByLabelsTableDef) queryDetail(db *gorm.DB, totalTime float64, startTime, endTime string, quantiles Quantiles) ([]*TotalTimeByLabels, error) {
	if len(t.labels) == 0 {
		return nil, nil
	}
	tables := fmt.Sprintf("metrics_schema.%s_total_time t0", t.tbl)
	tables += fmt.Sprintf(", metrics_schema.%s_total_count t1", t.tbl)
	tableNum := 2
	for ; tableNum < QuantileNum+2; tableNum++ {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s_duration %s", t.tbl, tableAlias)
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
		sum(t0.value) as totalTime
		sum(t1.value) as totalCount
		max(t2.value) as maxValueOfQ1
		max(t3.value) as maxValueOfQ2
		max(t4.value) as maxValueOfQ3
		max(t5.value) as maxValueOfQ4
		`,
		t.name, labelFields, ratioSumValueField)

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)

	quantileList := []float64{quantiles.Q1, quantiles.Q2, quantiles.Q3, quantiles.Q4}
	tableNum = 2
	for _, quantile := range quantileList {
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
	if len(joinSQL) != 0 {
		query = query.Where(joinSQL)
	}

	groupSQL := "t0.`" + strings.Join(t.labels, "`, t0.`") + "`"
	orderSQL := "sum(t0.value) desc"
	query = query.
		Group(groupSQL).
		Having("sum(t0.value) > 0").
		Order(orderSQL)

	var result []*TotalTimeByLabels
	if err := query.Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
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
	row, err := t.querySummary(db, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}
	values := row.toStringSlice()
	if len(t.labels) == 0 {
		return &TableRowDef{
			Values:    values,
			SubValues: nil,
			Comment:   genComment(t.comment, t.labels),
		}, nil
	}

	subRows, err := t.queryDetail(db, arg.startTime, arg.endTime, arg.quantiles)
	if err != nil {
		return nil, err
	}

	subValues := make([][]string, 0, len(subRows))
	for _, row := range subRows {
		subValues = append(subValues, row.toStringSlice())
	}
	return &TableRowDef{
		Values:    values,
		SubValues: subValues,
		Comment:   genComment(t.comment, t.labels),
	}, nil
}

type TotalValueAndTotalCount struct {
	Name       string
	Label      string
	TotalSum   float64
	TotalCount float64
	MaxValueOfQuantile
	flag bool
}

func (t *TotalValueAndTotalCount) setFlag(flag bool) {
	t.flag = flag
}

func (t *TotalValueAndTotalCount) toStringSlice() []string {
	stringSlice := []string{
		t.Name,
		t.Label,
		convertFloatToIntString(t.TotalSum),
		convertFloatToIntString(t.TotalCount),
	}
	if !t.flag {
		return stringSlice
	}

	stringSlice = append(stringSlice,
		convertFloatToIntString(t.MaxValueOfQ1),
		convertFloatToIntString(t.MaxValueOfQ2),
		convertFloatToIntString(t.MaxValueOfQ3),
		convertFloatToIntString(t.MaxValueOfQ4),
	)
	return stringSlice
}

func (t totalValueAndTotalCountTableDef) querySummary(db *gorm.DB, startTime, endTime string, quantiles Quantiles) (*TotalValueAndTotalCount, error) {
	tables := fmt.Sprintf("metrics_schema.%s t0", t.sumTbl)
	tables += fmt.Sprintf(", metrics_schema.%s t1", t.countTbl)
	tableNum := 2
	for ; tableNum < QuantileNum+2; tableNum++ {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s %s", t.tbl, tableAlias)
	}

	fields := fmt.Sprintf(`
		'%s' as name,
		'' as label,
		sum(t0.value) as totalSum
		sum(t1.value) as totalCount
		max(t2.value) as maxValueOfQ1
		max(t3.value) as maxValueOfQ2
		max(t4.value) as maxValueOfQ3
		max(t5.value) as maxValueOfQ4
		`,
		t.name)

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)

	quantileList := []float64{quantiles.Q1, quantiles.Q2, quantiles.Q3, quantiles.Q4}
	tableNum = 2
	for _, quantile := range quantileList {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		query = query.Where(fmt.Sprintf("%[1]s.time >= ? AND %[1]s.time < ? AND %[1]s.quantile = ?", tableAlias), startTime, endTime, quantile)
		tableNum++
	}

	var result = &TotalValueAndTotalCount{}
	result.setFlag(quantiles.Q1 != 0.0)
	if err := query.First(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (t totalValueAndTotalCountTableDef) queryDetail(db *gorm.DB, startTime, endTime string, quantiles Quantiles) (result []*TotalValueAndTotalCount, err error) {
	if len(t.labels) == 0 {
		return nil, nil
	}
	tables := fmt.Sprintf("metrics_schema.%s t0", t.sumTbl)
	tables += fmt.Sprintf(", metrics_schema.%s t1", t.countTbl)
	tableNum := 2
	for ; tableNum < QuantileNum+2; tableNum++ {
		tableAlias := fmt.Sprintf("t%v", tableNum)
		tables += fmt.Sprintf(", metrics_schema.%s %s", t.tbl, tableAlias)
	}

	labelFields := fmt.Sprintf("t0.`%v`", strings.Join(t.labels, "`||','||t0.`"))
	fields := fmt.Sprintf(`
		'%s' as name,
		%s as label,
		sum(t0.value) as totalSum
		sum(t1.value) as totalCount
		max(t2.value) as maxValueOfQ1
		max(t3.value) as maxValueOfQ2
		max(t4.value) as maxValueOfQ3
		max(t5.value) as maxValueOfQ4
		`,
		t.name, labelFields)

	query := db.
		Select(fields).
		Table(tables).
		Where("t0.time >= ? AND t0.time < ?", startTime, endTime).
		Where("t1.time >= ? AND t1.time < ?", startTime, endTime)

	quantileList := []float64{quantiles.Q1, quantiles.Q2, quantiles.Q3, quantiles.Q4}
	tableNum = 2
	for _, quantile := range quantileList {
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
	if len(joinSQL) != 0 {
		query = query.Where(joinSQL)
	}

	groupSQL := "t0.`" + strings.Join(t.labels, "`, t0.`") + "`"
	orderSQL := "sum(t0.value) desc"
	query = query.
		Group(groupSQL).
		Having("sum(t0.value) > 0").
		Order(orderSQL)

	if err = query.Find(&result).Error; err != nil {
		return nil, err
	}

	flag := true
	if quantiles.Q1 == 0.0 {
		flag = false
	}
	for i := range result {
		result[i].setFlag(flag)
	}
	return result, nil
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

func convertFloatToIntString(f float64) string {
	f = math.Round(f)
	return fmt.Sprintf("%.0f", f)
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
	if mb := f / float64(1024*1024); mb > 0 {
		f = math.Round(mb*1000) / 1000
		return fmt.Sprintf("%.3f MB", f)
	}
	kb := f / float64(1024)
	f = math.Round(kb*1000) / 1000
	return fmt.Sprintf("%.3f KB", f)
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
