package diagnose_report

import (
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"strings"
)

type rowQuery interface {
	queryRow(arg *queryArg, db *sql.DB) (*TableRowDef, error)
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

type sumValueQuery struct {
	name  string
	tbl   string
	label string
}

// Table schema
// METRIC_NAME , LABEL  TOTAL_VALUE
func (def sumValueQuery) queryRow(arg *queryArg, db *sql.DB) (*TableRowDef, error) {
	if len(def.name) == 0 {
		def.name = def.tbl
	}
	sql := fmt.Sprintf("select '%v', '', sum(value) from metrics_schema.%v where time >= '%s' and time < '%s'",
		def.name, def.tbl, arg.startTime, arg.endTime)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	if len(def.label) == 0 {
		return &TableRowDef{
			Values: rows[0],
		}, nil
	}

	sql = fmt.Sprintf("select '%v',`%v`, sum(value) from metrics_schema.%v where time >= '%s' and time < '%s' group by `%[2]v` order by sum(value) desc",
		def.name, def.label, def.tbl, arg.startTime, arg.endTime)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	return &TableRowDef{
		Values:    rows[0],
		SubValues: subRows,
	}, nil
}

type totalTimeTableDef struct {
	name  string
	tbl   string
	label string
}

// Table schema
// METRIC_NAME , LABEL , TIME_RATIO ,  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80
func (t totalTimeTableDef) queryRow(arg *queryArg, db *sql.DB) (*TableRowDef, error) {
	sql := t.genSumarySQLs(arg.totalTime, arg.startTime, arg.endTime, arg.quantiles)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	if len(t.label) == 0 {
		return &TableRowDef{
			Values: rows[0],
		}, nil
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
	return &TableRowDef{
		Values:    rows[0],
		SubValues: subRows,
	}, nil
}

func (t totalTimeTableDef) genSumarySQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
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
	joinSql := fmt.Sprintf("select %v from %v", fields, tbls)
	return joinSql
}

func (t totalTimeTableDef) genDetailSQLs(totalTime float64, startTime, endTime string, quantiles []float64) string {
	if len(t.label) == 0 {
		return ""
	}
	joinSql := "select t0.*,t1.count"
	sqls := []string{
		fmt.Sprintf("select '%[1]s', `%[6]s`, if(%[2]v>0,sum(value)/%[2]v,1) , sum(value) as total from metrics_schema.%[3]s_total_time where time >= '%[4]s' and time < '%[5]s' group by `%[6]s`",
			t.name, totalTime, t.tbl, startTime, endTime, t.label),
		fmt.Sprintf("select `%[4]s`, sum(value) as count from metrics_schema.%[1]s_total_count where time >= '%[2]s' and time < '%[3]s' group by `%[4]s`",
			t.tbl, startTime, endTime, t.label),
	}
	for i, quantile := range quantiles {
		sql := fmt.Sprintf("select `%[5]s`, max(value) as max_value from metrics_schema.%[1]s_duration where time >= '%[2]s' and time < '%[3]s' and quantile=%[4]f group by `%[5]s`",
			t.tbl, startTime, endTime, quantile, t.label)
		sqls = append(sqls, sql)
		joinSql += fmt.Sprintf(",t%v.max_value", i+2)
	}
	joinSql += " from "
	for i, sql := range sqls {
		joinSql += fmt.Sprintf(" (%s) as t%v ", sql, i)
		if i != len(sqls)-1 {
			joinSql += "join "
		}
	}
	joinSql += " where "
	for i := 0; i < len(sqls)-1; i++ {
		if i > 0 {
			joinSql += "and "
		}
		joinSql += fmt.Sprintf(" t%v.%s = t%v.%s ", i, t.label, i+1, t.label)
	}
	joinSql += " order by t0.total desc"
	return joinSql
}

type totalValueAndTotalCountTableDef struct {
	name     string
	tbl      string
	sumTbl   string
	countTbl string
	label    string
}

// Table schema
// METRIC_NAME , LABEL  TOTAL_VALUE , TOTAL_COUNT , P999 , P99 , P90 , P80
func (t totalValueAndTotalCountTableDef) queryRow(arg *queryArg, db *sql.DB) (*TableRowDef, error) {
	sql := t.genSumarySQLs(arg.startTime, arg.endTime, arg.quantiles)
	rows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	if len(t.label) == 0 {
		return &TableRowDef{
			Values: rows[0],
		}, nil

	}
	sql = t.genDetailSQLs(arg.startTime, arg.endTime, arg.quantiles)
	subRows, err := querySQL(db, sql)
	if err != nil {
		return nil, err
	}
	return &TableRowDef{
		Values:    rows[0],
		SubValues: subRows,
	}, nil
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
	joinSql := fmt.Sprintf("select %v from %v", fields, tbls)
	return joinSql
}

func (t totalValueAndTotalCountTableDef) genDetailSQLs(startTime, endTime string, quantiles []float64) string {
	if len(t.label) == 0 {
		return ""
	}
	joinSql := "select t0.*,t1.count"
	sqls := []string{
		fmt.Sprintf("select '%[1]s', `%[5]s` , sum(value) as total from metrics_schema.%[2]s where time >= '%[3]s' and time < '%[4]s' group by `%[5]s`",
			t.name, t.sumTbl, startTime, endTime, t.label),
		fmt.Sprintf("select `%[4]s`, sum(value) as count from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s' group by `%[4]s`",
			t.countTbl, startTime, endTime, t.label),
	}
	for i, quantile := range quantiles {
		sql := fmt.Sprintf("select `%[5]s`, max(value) as max_value from metrics_schema.%[1]s where time >= '%[2]s' and time < '%[3]s' and quantile=%[4]f group by `%[5]s`",
			t.tbl, startTime, endTime, quantile, t.label)
		sqls = append(sqls, sql)
		joinSql += fmt.Sprintf(",t%v.max_value", i+2)
	}
	joinSql += " from "
	for i, sql := range sqls {
		joinSql += fmt.Sprintf(" (%s) as t%v ", sql, i)
		if i != len(sqls)-1 {
			joinSql += "join "
		}
	}
	joinSql += " where "
	for i := 0; i < len(sqls)-1; i++ {
		if i > 0 {
			joinSql += "and "
		}
		joinSql += fmt.Sprintf(" t%v.%s = t%v.%s ", i, t.label, i+1, t.label)
	}
	joinSql += " order by t0.total desc"
	return joinSql
}

func querySQL(db *sql.DB, sql string) ([][]string, error) {
	if len(sql) == 0 {
		return nil, nil
	}
	rows, err := db.Query(sql)
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

func RoundFloatString(s string) string {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return s
	}
	if f == 0 {
		return "0"
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
	str := fmt.Sprintf(format, f)
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
