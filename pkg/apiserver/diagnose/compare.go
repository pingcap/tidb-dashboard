// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"container/heap"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/pingcap/errors"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

func GetCompareReportTablesForDisplay(startTime1, endTime1, startTime2, endTime2 string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string) []*TableDef {
	errRows := checkBeforeReport(db)
	if len(errRows) > 0 {
		return []*TableDef{GenerateReportError(errRows)}
	}
	var resultTables []*TableDef
	resultTables = append(resultTables, GetCompareHeaderTimeTable(startTime1, endTime1, startTime2, endTime2))
	var tables0, tables1, tables2, tables3, tables4 []*TableDef
	var errRows0, errRows1, errRows2, errRows3, errRows4 []TableRowDef
	var compareDiagnoseTable, abnormalSlowQuery *TableDef
	var wg sync.WaitGroup
	wg.Add(7)
	var progress, totalTableCount int32
	go func() {
		// Get Header tables.
		tables0, errRows0 = GetReportHeaderTables(startTime2, endTime2, db, sqliteDB, reportID, &progress, &totalTableCount)
		errRows = append(errRows, errRows0...)
		wg.Done()
	}()
	go func() {
		// Get tables in 2 ranges
		tables1, errRows1 = GetReportTablesIn2Range(startTime1, endTime1, startTime2, endTime2, db, sqliteDB, reportID, &progress, &totalTableCount)
		errRows = append(errRows, errRows1...)
		wg.Done()
	}()
	go func() {
		// Get compare refer tables
		tables2, errRows2 = getCompareTables(startTime1, endTime1, db, sqliteDB, reportID, &progress, &totalTableCount)
		errRows = append(errRows, errRows2...)
		wg.Done()
	}()

	go func() {
		// Get compare tables
		tables3, errRows3 = getCompareTables(startTime2, endTime2, db.Session(&gorm.Session{NewDB: true}), sqliteDB, reportID, &progress, &totalTableCount)
		errRows = append(errRows, errRows3...)
		wg.Done()
	}()
	go func() {
		tbl, errRow := CompareDiagnose(startTime1, endTime1, startTime2, endTime2, db)
		if errRow != nil {
			errRows = append(errRows, *errRow)
		} else {
			compareDiagnoseTable = &tbl
		}
		wg.Done()
	}()
	go func() {
		tbl, errRow := getTiDBAbnormalSlowQueryOnly(startTime1, endTime1, startTime2, endTime2, db)
		if errRow != nil {
			errRows = append(errRows, *errRow)
		} else {
			abnormalSlowQuery = &tbl
		}
		wg.Done()
	}()
	go func() {
		// Get end tables
		tables4, errRows4 = GetReportEndTables(startTime2, endTime2, db, sqliteDB, reportID, &progress, &totalTableCount)
		errRows = append(errRows, errRows4...)
		wg.Done()
	}()
	wg.Wait()

	tables, errs := CompareTables(tables2, tables3)
	errRows = append(errRows, errs...)
	resultTables = append(resultTables, tables0...)
	if abnormalSlowQuery != nil {
		resultTables = append(resultTables, abnormalSlowQuery)
	}
	resultTables = append(resultTables, tables1...)
	if compareDiagnoseTable != nil {
		resultTables = append(resultTables, compareDiagnoseTable)
	}
	resultTables = append(resultTables, tables...)
	resultTables = append(resultTables, tables4...)

	if len(errRows) > 0 {
		resultTables = append(resultTables, GenerateReportError(errRows))
	}
	return resultTables
}

func CompareTables(tables1, tables2 []*TableDef) ([]*TableDef, []TableRowDef) {
	var errRows []TableRowDef
	dr := &diffRows{}
	resultTables := make([]*TableDef, 1, len(tables1))
	for _, tbl1 := range tables1 {
		for _, tbl2 := range tables2 {
			if strings.Join(tbl1.Category, ",") == strings.Join(tbl2.Category, ",") &&
				tbl1.Title == tbl2.Title {
				table, err := compareTable(tbl1, tbl2, dr)
				if err != nil {
					errRows = appendErrorRow(*tbl1, err, errRows)
				} else if table != nil {
					resultTables = append(resultTables, table)
				}
			}
		}
	}
	resultTables[0] = GenerateDiffTable(*dr)
	return resultTables, errRows
}

func GenerateDiffTable(dr diffRows) *TableDef {
	l := dr.Len()
	sort.Slice(dr, func(i, j int) bool {
		abs1 := math.Abs(math.Round(dr[i].ratio*100) / 100)
		abs2 := math.Abs(math.Round(dr[j].ratio*100) / 100)
		if abs1 != abs2 {
			return abs1 > abs2
		}
		vi1, err1 := parseFloat(dr[i].v1)
		vi2, err2 := parseFloat(dr[i].v2)
		vj1, err3 := parseFloat(dr[j].v1)
		vj2, err4 := parseFloat(dr[j].v2)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			// should never be error herr.
			return false
		}
		return math.Abs(vi2-vi1) > math.Abs(vj1-vj2)
	})

	type groupValue struct {
		name     string
		ratioIdx int
	}
	rows := make([]TableRowDef, 0, l)
	rowMap := make(map[groupValue]int, l)
	for i := range dr {
		row := dr[i]
		name := ""
		if labels := strings.Split(row.label, ","); len(labels) > 0 {
			name = labels[0]
		}
		if len(name) == 0 {
			continue
		}
		label := ""
		if len(name) < len(row.label) {
			label = row.label[len(name)+1:]
		}
		vs := []string{
			row.table,
			name,
			label,
			fmt.Sprintf("%.2f", row.ratio),
			row.v1,
			row.v2,
			row.colName,
		}
		if idx, ok := rowMap[groupValue{name: name, ratioIdx: row.ratioIdx}]; ok {
			var lastValue []string
			if len(rows[idx].SubValues) == 0 {
				lastValue = rows[idx].Values
			} else {
				lastIdx := len(rows[idx].SubValues) - 1
				lastValue = rows[idx].SubValues[lastIdx]
			}
			equal := true
			for i := 3; i <= 5; i++ {
				if vs[i] != lastValue[i] {
					equal = false
					break
				}
			}
			if !equal {
				rows[idx].SubValues = append(rows[idx].SubValues, vs)
			}
			continue
		}
		rowMap[groupValue{name: name, ratioIdx: row.ratioIdx}] = len(rows)
		rows = append(rows, TableRowDef{
			Values:  vs,
			Comment: row.comment,
		})
	}
	return &TableDef{
		Category: []string{CategoryOverview},
		Title:    "max_diff_item",
		Comment:  "",
		Column:   []string{"TABLE", "METRIC_NAME", "LABEL", "MAX_DIFF", "t1.VALUE", "t2.VALUE", "VALUE_TYPE"},
		Rows:     rows,
	}
}

func compareTable(table1, table2 *TableDef, dr *diffRows) (_ *TableDef, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = errors.Errorf("compare table %s ,%s panic", table1.Category, table1.Title)
		}
	}()
	if strings.Contains(strings.ToLower(table1.Title), "config") {
		return compareTableWithNonUniqueKey(table1, table2, &diffRows{})
	}
	labelsMap1, err := getTableLablesMap(table1)
	if err != nil {
		return nil, err
	}
	labelsMap2, err := getTableLablesMap(table2)
	if err != nil {
		return nil, err
	}

	resultRows := make([]TableRowDef, 0, len(table1.Rows))
	for i := range table1.Rows {
		label1 := genRowLabel(table1.Rows[i].Values, table1.joinColumns)
		row2, ok := labelsMap2[label1]
		if !ok {
			row2 = &TableRowDef{}
		}
		newRow, err := joinRow(&table1.Rows[i], row2, table1, dr)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, *newRow)
	}
	for i := range table2.Rows {
		label2 := genRowLabel(table2.Rows[i].Values, table2.joinColumns)
		_, ok := labelsMap1[label2]
		if ok {
			continue
		}
		row1 := &TableRowDef{}
		newRow, err := joinRow(row1, &table2.Rows[i], table1, dr)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, *newRow)
	}

	resultTable := &TableDef{
		Category:       table1.Category,
		Title:          table1.Title,
		Comment:        table1.Comment,
		joinColumns:    nil,
		compareColumns: nil,
	}
	columns := make([]string, 0, len(table1.Column)*2-len(table1.joinColumns))
	for i := range table1.Column {
		if checkIn(i, table1.joinColumns) {
			columns = append(columns, table1.Column[i])
		} else {
			columns = append(columns, "t1."+table1.Column[i])
		}
	}
	for i := range table2.Column {
		if !checkIn(i, table2.joinColumns) {
			columns = append(columns, "t2."+table2.Column[i])
		}
	}
	for _, idx := range table1.compareColumns {
		columns = append(columns, table1.Column[idx]+"_DIFF_RATIO")
	}
	sort.Slice(resultRows, func(i, j int) bool {
		return math.Abs(resultRows[i].ratio) > math.Abs(resultRows[j].ratio)
	})
	if len(table1.compareColumns) > 0 {
		for _, idx := range table1.compareColumns {
			comment := table1.Column[idx] + "_DIFF_RATIO=" + fmt.Sprintf("if t2.%[1]s > t1.%[1]s => { t2.%[1]s / t1.%[1]s - 1 } else => { 1 - t1.%[1]s / t2.%[1]s }", table1.Column[idx])
			if len(resultTable.Comment) > 0 {
				resultTable.Comment += ", \n"
			}
			resultTable.Comment += comment
		}
	}

	resultTable.Column = columns
	resultTable.Rows = resultRows
	return resultTable, nil
}

func compareTableWithNonUniqueKey(table1, table2 *TableDef, dr *diffRows) (_ *TableDef, err error) {
	defer func() {
		defer func() {
			if v := recover(); v != nil {
				err = errors.Errorf("join table error %v,%v", table1.Category, table1.Title)
			}
		}()
	}()
	labelsMap1, err := getTableLablesMapWithNonUniqueJoinKey(table1)
	if err != nil {
		return nil, err
	}
	labelsMap2, err := getTableLablesMapWithNonUniqueJoinKey(table2)
	if err != nil {
		return nil, err
	}

	resultRows := make([]TableRowDef, 0, len(table1.Rows))
	for i := range table1.Rows {
		label1 := genRowLabel(table1.Rows[i].Values, table1.joinColumns)
		var row2 *TableRowDef
		if row2s, ok := labelsMap2[label1]; ok && len(row2s) > 0 {
			row2 = row2s[0]
			if len(row2s) == 1 {
				delete(labelsMap2, label1)
			} else {
				labelsMap2[label1] = row2s[1:]
			}
		} else {
			delete(labelsMap2, label1)
			row2 = &TableRowDef{}
		}
		if row1s, ok := labelsMap1[label1]; ok {
			if len(row1s) <= 1 {
				delete(labelsMap1, label1)
			} else {
				labelsMap1[label1] = row1s[1:]
			}
		}
		newRow, err := joinRow(&table1.Rows[i], row2, table1, dr)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, *newRow)
	}
	for len(labelsMap2) > 0 {
		for label, row2s := range labelsMap2 {
			if len(row2s) == 0 {
				delete(labelsMap2, label)
				continue
			}
			row2 := row2s[0]
			if len(row2s) == 1 {
				delete(labelsMap2, label)
			} else {
				labelsMap2[label] = row2s[1:]
			}
			var row1 *TableRowDef
			if row1s, ok := labelsMap1[label]; ok && len(row1s) > 0 {
				row1 = row1s[0]
				if len(row1s) == 0 {
					delete(labelsMap1, label)
				} else {
					labelsMap1[label] = row1s[1:]
				}
			} else {
				delete(labelsMap1, label)
				row1 = &TableRowDef{}
			}
			newRow, err := joinRow(row1, row2, table1, dr)
			if err != nil {
				return nil, err
			}
			resultRows = append(resultRows, *newRow)
		}
	}

	resultTable := &TableDef{
		Category:       table1.Category,
		Title:          table1.Title,
		Comment:        table1.Comment,
		joinColumns:    nil,
		compareColumns: nil,
	}
	columns := make([]string, 0, len(table1.Column)*2-len(table1.joinColumns))
	for i := range table1.Column {
		if checkIn(i, table1.joinColumns) {
			columns = append(columns, table1.Column[i])
		} else {
			columns = append(columns, "t1."+table1.Column[i])
		}
	}
	for i := range table2.Column {
		if !checkIn(i, table2.joinColumns) {
			columns = append(columns, "t2."+table2.Column[i])
		}
	}
	for _, idx := range table1.compareColumns {
		columns = append(columns, table1.Column[idx]+"_DIFF_RATIO")
	}
	sort.Slice(resultRows, func(i, j int) bool {
		if len(table1.joinColumns) > 0 {
			idx := table1.joinColumns[0]
			if len(resultRows[i].Values) > (idx+1) &&
				len(resultRows[j].Values) > (idx+1) {
				if resultRows[i].Values[idx] != resultRows[j].Values[idx] {
					return resultRows[i].Values[idx] < resultRows[j].Values[idx]
				}
				return resultRows[i].Values[0] < resultRows[j].Values[0]
			}
		}
		return false
	})
	for _, idx := range table1.compareColumns {
		comment := table1.Column[idx] + "_DIFF_RATIO=" + fmt.Sprintf("(t2.%[1]s-t1.%[1]s)/max(t2.%[1]s, t1.%[1]s)", table1.Column[idx])
		if len(resultTable.Comment) > 0 {
			resultTable.Comment += ", \n"
		}
		resultTable.Comment += comment
	}

	resultTable.Column = columns
	resultTable.Rows = resultRows
	return resultTable, nil
}

func getTableLablesMapWithNonUniqueJoinKey(table *TableDef) (map[string][]*TableRowDef, error) {
	if len(table.joinColumns) == 0 {
		return nil, errors.Errorf("category %v,table %v doesn't have join columns", strings.Join(table.Category, ","), table.Title)
	}
	labelsMap := make(map[string][]*TableRowDef, len(table.Rows))
	for i := range table.Rows {
		label := genRowLabel(table.Rows[i].Values, table.joinColumns)
		labelsMap[label] = append(labelsMap[label], &table.Rows[i])
	}
	return labelsMap, nil
}

func joinRow(row1, row2 *TableRowDef, table *TableDef, dr *diffRows) (*TableRowDef, error) {
	rowsMap1, err := genRowsLablesMap(table, row1.SubValues)
	if err != nil {
		return nil, err
	}
	rowsMap2, err := genRowsLablesMap(table, row2.SubValues)
	if err != nil {
		return nil, err
	}

	subJoinRows := make([]*newJoinRow, 0, len(row1.SubValues))
	for _, subRow1 := range row1.SubValues {
		label := genRowLabel(subRow1, table.joinColumns)
		subRow2 := rowsMap2[label]
		ratio, ratios, idx, err := calculateDiffRatio(subRow1, subRow2, table)
		if err != nil {
			return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), subRow1, subRow2)
		}
		subJoinRows = append(subJoinRows, &newJoinRow{
			row1:   subRow1,
			row2:   subRow2,
			ratio:  ratio,
			ratios: ratios,
		})
		dr.addRow(table, label, ratio, subRow1, subRow2, idx, row1.Comment)
	}

	for _, subRow2 := range row2.SubValues {
		label := genRowLabel(subRow2, table.joinColumns)
		subRow1, ok := rowsMap1[label]
		if ok {
			continue
		}
		ratio, ratios, idx, err := calculateDiffRatio(subRow1, subRow2, table)
		if err != nil {
			return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), subRow1, subRow2)
		}

		subJoinRows = append(subJoinRows, &newJoinRow{
			row1:   subRow1,
			row2:   subRow2,
			ratio:  ratio,
			ratios: ratios,
		})
		dr.addRow(table, label, ratio, subRow1, subRow2, idx, row2.Comment)
	}

	sort.Slice(subJoinRows, func(i, j int) bool {
		return math.Abs(subJoinRows[i].ratio) > math.Abs(subJoinRows[j].ratio)
	})
	totalRatio := float64(0)
	var totalRatios []float64
	resultSubRows := make([][]string, 0, len(row1.SubValues))
	for _, r := range subJoinRows {
		resultSubRows = append(resultSubRows, r.genNewRow(table))
	}

	totalRatioIdx := -1
	if len(row1.Values) != len(row2.Values) {
		totalRatio = 1
		totalRatios = nil
	} else {
		totalRatio, totalRatios, totalRatioIdx, err = calculateDiffRatio(row1.Values, row2.Values, table)
		if err != nil {
			return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), row1.Values, row2.Values)
		}
	}
	if len(row1.SubValues) == 0 && len(row2.SubValues) == 0 {
		label := ""
		if len(row1.Values) >= len(table.Column) {
			label = genRowLabel(row1.Values, table.joinColumns)
		} else if len(row2.Values) >= len(table.Column) {
			label = genRowLabel(row2.Values, table.joinColumns)
		}
		dr.addRow(table, label, totalRatio, row1.Values, row2.Values, totalRatioIdx, row1.Comment)
	}

	resultJoinRow := newJoinRow{
		row1:   row1.Values,
		row2:   row2.Values,
		ratio:  totalRatio,
		ratios: totalRatios,
	}

	resultRow := &TableRowDef{
		Values:    resultJoinRow.genNewRow(table),
		SubValues: resultSubRows,
		ratio:     totalRatio,
		Comment:   row1.Comment,
	}
	return resultRow, nil
}

type diffRow struct {
	table    string
	label    string
	ratio    float64
	ratioIdx int
	colName  string
	v1       string
	v2       string
	comment  string
}

type diffRows []diffRow

func (r diffRows) Len() int           { return len(r) }
func (r diffRows) Less(i, j int) bool { return math.Abs(r[i].ratio) < math.Abs(r[j].ratio) }
func (r diffRows) Swap(i, j int)      { r[i], r[j] = r[j], r[i] }

func (r *diffRows) Push(x interface{}) {
	*r = append(*r, x.(diffRow))
}

func (r *diffRows) Pop() interface{} {
	old := *r
	n := len(old)
	x := old[n-1]
	*r = old[0 : n-1]
	return x
}

func (r *diffRows) addRow(table *TableDef, label string, ratio float64, vs1, vs2 []string, idx int, comment string) {
	if ratio == 0 {
		return
	}
	tableName := strings.Join(table.Category, "-") + ", " + table.Title
	colName := ""
	if idx > 0 && idx < len(table.Column) {
		comment = comment + ", the value is " + table.Column[idx]
		colName = table.Column[idx]
	}
	v1 := ""
	v2 := ""
	if idx >= 0 {
		if idx < len(vs1) {
			v1 = vs1[idx]
		}
		if idx < len(vs2) {
			v2 = vs2[idx]
		}
	}
	r.appendRow(diffRow{
		table:    tableName,
		label:    label,
		ratio:    ratio,
		ratioIdx: idx,
		colName:  colName,
		v1:       v1,
		v2:       v2,
		comment:  comment,
	})
}

func (r *diffRows) appendRow(row diffRow) {
	heap.Push(r, row)
	if r.Len() > 500 {
		heap.Pop(r)
	}
}

type newJoinRow struct {
	row1   []string
	row2   []string
	ratio  float64
	ratios []float64
}

func (r *newJoinRow) genNewRow(table *TableDef) []string {
	newRow := make([]string, 0, len(r.row1)+len(r.row2))
	if len(r.row1) == 0 {
		newRow = append(newRow, make([]string, len(r.row2))...)
		for i := range r.row2 {
			if checkIn(i, table.joinColumns) {
				newRow[i] = r.row2[i]
			} else {
				newRow = append(newRow, r.row2[i])
			}
		}
		for i := range table.compareColumns {
			if len(r.ratios) > i {
				newRow = append(newRow, convertFloatToString(r.ratios[i]))
			} else {
				newRow = append(newRow, convertFloatToString(r.ratio))
			}
		}
		return newRow
	}

	newRow = append(newRow, r.row1...)
	if len(r.row2) == 0 {
		newRow = append(newRow, make([]string, len(r.row1)-len(table.joinColumns))...)
		for i := range table.compareColumns {
			if len(r.ratios) > i {
				newRow = append(newRow, convertFloatToString(r.ratios[i]))
			} else {
				newRow = append(newRow, convertFloatToString(r.ratio))
			}
		}
		return newRow
	}
	for i := range r.row2 {
		if !checkIn(i, table.joinColumns) {
			newRow = append(newRow, r.row2[i])
		}
	}
	for i := range table.compareColumns {
		if len(r.ratios) > i {
			newRow = append(newRow, convertFloatToString(r.ratios[i]))
		} else {
			newRow = append(newRow, convertFloatToString(r.ratio))
		}
	}
	return newRow
}

func calculateDiffRatio(row1, row2 []string, table *TableDef) (float64, []float64, int, error) {
	if len(table.compareColumns) == 0 {
		return 0, nil, -1, nil
	}
	if len(row1) == 0 && len(row2) == 0 {
		return 0, nil, -1, nil
	}
	ratios := make([]float64, 0, len(table.compareColumns))
	maxRatio := float64(0)
	needBetter := false
	maxIdx := -1
	for _, idx := range table.compareColumns {
		var f1, f2 float64
		var err error
		if idx < len(row1) {
			f1, err = parseFloat(row1[idx])
			if err != nil {
				return 0, nil, -1, err
			}
		}
		if idx < len(row2) {
			f2, err = parseFloat(row2[idx])
			if err != nil {
				return 0, nil, -1, err
			}
		}
		if f1 == f2 {
			ratios = append(ratios, 0)
			continue
		}
		ratio := float64(0)
		if f1 == 0 {
			ratio = f2
		} else if f2 == 0 {
			ratio = 0 - f1
		} else if f2 > f1 {
			ratio = f2/f1 - 1
		} else {
			ratio = 1 - f1/f2
		}
		ratios = append(ratios, ratio)
		if (f1 == 0 || f2 == 0) && maxRatio != 0 && !needBetter {
			continue
		}
		if math.Abs(ratio) > math.Abs(maxRatio) || (needBetter && f1 != 0 && f2 != 0) {
			maxRatio = ratio
			needBetter = f1 == 0 || f2 == 0
			maxIdx = idx
		}
	}
	return maxRatio, ratios, maxIdx, nil
}

func parseFloat(s string) (float64, error) {
	if len(s) == 0 {
		return float64(0), nil
	}
	cases := []struct {
		suffix string
		ratio  float64
	}{
		{" GB", float64(1024 * 1024 * 1024)},
		{" MB", float64(1024 * 1024)},
		{" KB", float64(1024)},
		{"%", float64(1)},
		{" s", float64(1)},
		{" ms", float64(1) / float64(1000)},
		{" us", float64(1) / float64(10e5)},
	}
	ratio := float64(1)
	for _, c := range cases {
		if strings.HasSuffix(s, c.suffix) {
			ratio = c.ratio
			s = s[:len(s)-len(c.suffix)]
			break
		}
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}
	return f * ratio, nil
}

func checkIn(idx int, idxs []int) bool {
	for _, i := range idxs {
		if i == idx {
			return true
		}
	}
	return false
}

func genRowLabel(row []string, joinColumns []int) string {
	label := ""
	for i, idx := range joinColumns {
		if i > 0 {
			label += ","
		}
		label += row[idx]
	}
	return label
}

func genRowsLablesMap(table *TableDef, rows [][]string) (map[string][]string, error) {
	labelsMap := make(map[string][]string, len(rows))
	for i := range rows {
		label := genRowLabel(rows[i], table.joinColumns)
		_, ok := labelsMap[label]
		if ok {
			return nil, errors.Errorf("category %v,table %v has duplicate join label: %v", strings.Join(table.Category, ","), table.Title, label)
		}
		labelsMap[label] = rows[i]
	}
	return labelsMap, nil
}

func getTableLablesMap(table *TableDef) (map[string]*TableRowDef, error) {
	if len(table.joinColumns) == 0 {
		return nil, errors.Errorf("category %v,table %v doesn't have join columns", strings.Join(table.Category, ","), table.Title)
	}
	labelsMap := make(map[string]*TableRowDef, len(table.Rows))
	for i := range table.Rows {
		label := genRowLabel(table.Rows[i].Values, table.joinColumns)
		_, ok := labelsMap[label]
		if ok {
			return nil, errors.Errorf("category %v,table %v has duplicate join label: %v", strings.Join(table.Category, ","), table.Title, label)
		}
		labelsMap[label] = &table.Rows[i]
	}
	return labelsMap, nil
}

func getCompareTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
	funcs := []getTableFunc{
		// Node
		GetLoadTable,
		GetCPUUsageTable,
		GetTiKVThreadCPUTable,
		GetGoroutinesCountTable,
		GetProcessMemUsageTable,

		// Overview
		GetTotalTimeConsumeTable,
		GetTotalErrorTable,

		// TiDB
		GetTiDBTimeConsumeTable,
		GetTiDBConnectionCountTable,
		GetTiDBTxnTableData,
		GetTiDBStatisticsInfo,
		GetTiDBDDLOwner,

		// PD
		GetPDTimeConsumeTable,
		GetPDSchedulerInfo,
		GetPDClusterStatusTable,
		GetStoreStatusTable,
		GetPDEtcdStatusTable,

		// TiKV
		GetTiKVTotalTimeConsumeTable,
		GetTiKVRocksDBTimeConsumeTable,
		GetTiKVErrorTable,
		GetTiKVStoreInfo,
		GetTiKVRegionSizeInfo,
		GetTiKVCopInfo,
		GetTiKVSchedulerInfo,
		GetTiKVRaftInfo,
		GetTiKVSnapshotInfo,
		GetTiKVGCInfo,
		GetTiKVTaskInfo,
		GetTiKVCacheHitTable,

		// Config
		GetPDConfigInfo,
		GetPDConfigChangeInfo,
		GetTiDBGCConfigInfo,
		GetTiDBGCConfigChangeInfo,
		GetTiKVRocksDBConfigInfo,
		GetTiKVRocksDBConfigChangeInfo,
		GetTiKVRaftStoreConfigInfo,
		GetTiKVRaftStoreConfigChangeInfo,
	}
	atomic.AddInt32(totalTableCount, int32(len(funcs)))
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetReportHeaderTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		// Header
		GetClusterHardwareInfoTable,
		GetClusterInfoTable,
	}
	atomic.AddInt32(totalTableCount, int32(len(funcs)))
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetReportEndTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		GetTiDBCurrentConfig,
		GetPDCurrentConfig,
		GetTiKVCurrentConfig,
	}
	atomic.AddInt32(totalTableCount, int32(len(funcs)))
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetCompareHeaderTimeTable(startTime1, endTime1, startTime2, endTime2 string) *TableDef {
	return &TableDef{
		Category: []string{CategoryHeader},
		Title:    "compare_report_time_range",
		Comment:  "",
		Column:   []string{"T1.START_TIME", "T1.END_TIME", "T2.START_TIME", "T2.END_TIME"},
		Rows: []TableRowDef{
			{Values: []string{startTime1, endTime1, startTime2, endTime2}},
		},
	}
}

func GetReportTablesIn2Range(startTime1, endTime1, startTime2, endTime2 string, db *gorm.DB, sqliteDB *dbstore.DB, reportID string, progress, totalTableCount *int32) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		// TiDB
		GetTiDBTopNSlowQuery,
		GetTiDBTopNSlowQueryGroupByDigest,
		GetTiDBSlowQueryWithDiffPlan,

		// Diagnose
		GetAllDiagnoseReport,
	}
	atomic.AddInt32(totalTableCount, int32(len(funcs)*2))

	tables := make([]*TableDef, 0, len(funcs))
	var errRows []TableRowDef

	var tables1, tables2 []*TableDef
	var errRows1, errRows2 []TableRowDef
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		tables1, errRows1 = getTablesParallel(startTime1, endTime1, db, funcs, sqliteDB, reportID, progress, totalTableCount)
		errRows = append(errRows, errRows1...)
		for _, tbl := range tables1 {
			if tbl.Rows != nil {
				tbl.Title += "_in_time_range_t1"
			}
		}
		wg.Done()
	}()
	go func() {
		tables2, errRows2 = getTablesParallel(startTime2, endTime2, db, funcs, sqliteDB, reportID, progress, totalTableCount)
		errRows = append(errRows, errRows2...)
		for _, tbl := range tables2 {
			if tbl.Rows != nil {
				tbl.Title += "_in_time_range_t2"
			}
		}
		wg.Done()
	}()
	wg.Wait()

	for len(tables1) > 0 && len(tables2) > 0 {
		tables = append(tables, tables1[0])
		tables = append(tables, tables2[0])
		tables1 = tables1[1:]
		tables2 = tables2[1:]
	}
	tables = append(tables, tables1...)
	tables = append(tables, tables2...)
	return tables, errRows
}

func appendErrorRow(tbl TableDef, err error, errRows []TableRowDef) []TableRowDef {
	if err == nil {
		return errRows
	}
	category := ""
	if tbl.Category != nil {
		category = strings.Join(tbl.Category, ",")
	}
	errRows = append(errRows, TableRowDef{Values: []string{category, tbl.Title, err.Error()}})
	return errRows
}

func getTiDBAbnormalSlowQueryOnly(startTime1, endTime1, startTime2, endTime2 string, db *gorm.DB) (TableDef, *TableRowDef) {
	sql := fmt.Sprintf(`select * from
    (select /*+ agg_to_cop(), hash_agg() */ count(*),
         min(time),
         sum(query_time) as sum_query_time,
         sum(process_time) as sum_process_time,
         sum(wait_time) as sum_wait_time,
         sum(commit_time),
         sum(request_count),
         sum(process_keys),
         sum(write_keys),
         max(cop_proc_max),
         min(query),min(prev_stmt),
         digest
    from information_schema.cluster_slow_query
    where time >= '%s'
            and time < '%s'
            and is_internal = false
    group by  digest) as t1
where t1.digest not in
    (select /*+ agg_to_cop(), hash_agg() */ digest
    from information_schema.cluster_slow_query
    where time >= '%s'
            and time < '%s'
    group by  digest)
order by  t1.sum_query_time desc limit 10`, startTime2, endTime2, startTime1, endTime1)
	table := TableDef{
		Category: []string{CategoryTiDB},
		Title:    "slow_query_t2",
		Comment:  sql,
		Column:   []string{"count(*)", "min(time)", "sum(query_time)", "sum(Process_time)", "sum(Wait_time)", "sum(Commit_time)", "sum(Request_count)", "sum(process_keys)", "sum(Write_keys)", "max(Cop_proc_max)", "min(query)", "min(prev_stmt)", "digest"},
	}
	rows, err := getSQLRows(db, sql)
	if err != nil {
		return table, &TableRowDef{Values: []string{strings.Join(table.Category, ","), table.Title, err.Error()}}
	}
	table.Rows = useSubRowForLongColumnValue(rows, len(table.Column)-3)
	return table, nil
}

func useSubRowForLongColumnValue(rows []TableRowDef, colIdx int) []TableRowDef {
	maxLen := 100
	for i := range rows {
		row := rows[i]
		if len(row.Values) <= colIdx {
			continue
		}
		if len(row.Values[colIdx]) > maxLen {
			subRow := make([]string, len(row.Values))
			subRow[colIdx] = row.Values[colIdx]
			rows[i].Values[colIdx] = row.Values[colIdx][:100]
			rows[i].SubValues = append(rows[i].SubValues, subRow)
		}
	}
	return rows
}
