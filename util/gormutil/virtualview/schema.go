// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package virtualview

import (
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/antonmedv/expr/ast"
	"github.com/antonmedv/expr/parser"
	"github.com/fatih/structtag"
	"gorm.io/gorm/schema"
)

type viewFieldProps struct {
	jsonNameL            string   // JSON name in lower case. Possibly empty, means field is JSON unexported.
	viewExpr             string   // Possibly empty, means either vexpr tag is not set, or is set to empty
	columnNameL          string   // DB column name in lower case.
	dependOnColumnNamesL []string // Possibly nil when viewExpr is empty.

	// isInvalid indicates whether this field can be safely used to construct SQL clauses.
	// Fields are not invalid by default. It can be updated by updateFieldAvailability.
	isInvalid bool
}

func decodeField(ft reflect.StructField) (props viewFieldProps, err error) {
	// parse vexpr tag
	props.viewExpr = ft.Tag.Get("vexpr")

	// parse JSON tag
	{
		props.jsonNameL = strings.ToLower(ft.Name)
		tags, _ := structtag.Parse(string(ft.Tag))
		if tags != nil {
			jsonTag, _ := tags.Get("json")
			if jsonTag != nil && jsonTag.Name != "" {
				props.jsonNameL = strings.ToLower(jsonTag.Name)
			}
			if props.jsonNameL == "-" {
				props.jsonNameL = ""
			}
		}
	}

	// parse gorm tag
	{
		gormTag := schema.ParseTagSetting(ft.Tag.Get("gorm"), ";")
		dbName := gormTag["COLUMN"]
		if dbName == "" {
			dbName = schema.NamingStrategy{}.ColumnName("", ft.Name)
		}
		props.columnNameL = strings.ToLower(dbName)
	}

	if props.viewExpr != "" {
		depFields, err := parseExprDependencies(props.viewExpr)
		if err != nil {
			return viewFieldProps{}, err
		}
		props.dependOnColumnNamesL = depFields
	}

	return
}

type identVisitor struct {
	idents []string
}

func (v *identVisitor) Enter(_ *ast.Node) {}
func (v *identVisitor) Exit(node *ast.Node) {
	if n, ok := (*node).(*ast.IdentifierNode); ok {
		v.idents = append(v.idents, n.Value)
	}
}

// Note: not all SQL statement is supported.
// For example, CAST(.. AS SIGNED) ans `COLUMN` is unsupported.
func parseExprDependencies(expr string) ([]string, error) {
	// Parse idents
	tree, err := parser.Parse(expr)
	if err != nil {
		return nil, err
	}
	visitor := &identVisitor{}
	ast.Walk(&tree.Node, visitor)

	// Normalize and deduplicate idents
	identMap := map[string]struct{}{}
	for _, ident := range visitor.idents {
		identMap[strings.ToLower(ident)] = struct{}{}
	}
	idents := make([]string, 0, len(identMap))
	for ident := range identMap {
		idents = append(idents, ident)
	}
	sort.Strings(idents)
	return idents, nil
}

// updateAvailability updates field's availability according to the `knownColumnNamesL` parameter:
//   - For calculated fields (vexpr is specified), the field is available when
//     all of its dependency columns exist in knownColumnNamesL.
//   - For normal fields (vexpr is not specified), the field is available when
//     itself exists in knownColumnNamesL.
//
// If knownColumnNamesL is nil, all fields will be set to available.
func (fp *viewFieldProps) updateAvailability(knownColumnNamesL map[string]struct{}) {
	fp.isInvalid = false
	if knownColumnNamesL == nil {
		return
	}

	if fp.viewExpr == "" {
		// This is not a calculated field.
		if _, ok := knownColumnNamesL[fp.columnNameL]; !ok {
			fp.isInvalid = true
			return
		}
	}

	// This is a calculated field. Any missing dependency field result in a invalid status.
	for _, columnNameL := range fp.dependOnColumnNamesL {
		if _, ok := knownColumnNamesL[columnNameL]; !ok {
			fp.isInvalid = true
			return
		}
	}
}

type viewSchema struct {
	fields             []*viewFieldProps
	fieldByJSONNameL   map[string]*viewFieldProps
	fieldByColumnNameL map[string]*viewFieldProps
}

func parseViewModelSchema(model interface{}) (viewSchema, error) {
	v := reflect.Indirect(reflect.ValueOf(model))
	vt := v.Type()

	fields := make([]*viewFieldProps, 0)

	for i := 0; i < vt.NumField(); i++ {
		ft := vt.Field(i)
		props, err := decodeField(ft)
		if err != nil {
			return viewSchema{}, fmt.Errorf("field %s is invalid: %w", ft.Name, err)
		}
		if props.jsonNameL == "" {
			// this field is unexported, skip.
			continue
		}
		fields = append(fields, &props)
	}

	vs := viewSchema{
		fields:             fields,
		fieldByJSONNameL:   map[string]*viewFieldProps{},
		fieldByColumnNameL: map[string]*viewFieldProps{},
	}
	for _, field := range fields {
		vs.fieldByJSONNameL[field.jsonNameL] = field
		vs.fieldByColumnNameL[field.columnNameL] = field
	}
	return vs, nil
}

func (schema *viewSchema) updateFieldsAvailability(knownColumnNames []string) {
	if knownColumnNames == nil {
		for _, field := range schema.fields {
			field.updateAvailability(nil)
		}
		return
	}

	columnNamesL := map[string]struct{}{}
	for _, columnName := range knownColumnNames {
		columnNamesL[strings.ToLower(columnName)] = struct{}{}
	}
	for _, field := range schema.fields {
		field.updateAvailability(columnNamesL)
	}
}
