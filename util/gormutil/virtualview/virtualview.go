// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package virtualview

import (
	"fmt"
	"strings"
	"sync"

	"gorm.io/gorm/clause"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

// VirtualView is a helper to construct SQL clauses for view-like models, based on the view definition in
// the `vexpr` tag in the model.
//
// For a model field like:
//
//	AggLastSeen   int  `vexpr:"UNIX_TIMESTAMP(MAX(last_seen))"`
//
// VirtualView can build projections like:
//
//	    SELECT UNIX_TIMESTAMP(MAX(last_seen)) AS agg_last_seen ....
//													^^^^^^^^^^^^^ This follows the GORM naming strategy and
//																  can be controlled by gorm:"column:xxx".
//
// Then, when selecting the result of this projection into the same model, fields will be filled out naturally:
//
//	    {
//		     AggLastSeen: <the result of `UNIX_TIMESTAMP(MAX(last_seen))`>
//	    }
//
// If `vexpr` is not specified in the model field, the field can be transparently used. For example:
//
//	FieldFoo  int
//
// The projection will be:
//
//	SELECT field_foo ...
//
// Callers must specify the fields to be used in clauses. The field can be specified via its JSON name.
//
// VirtualView is safe to be used concurrently.
type VirtualView struct {
	nocopy.NoCopy
	fullSchema viewSchema

	mu sync.Mutex
}

func New(model interface{}) (*VirtualView, error) {
	schema, err := parseViewModelSchema(model)
	if err != nil {
		return nil, err
	}
	return &VirtualView{
		fullSchema: schema,
	}, nil
}

func MustNew(model interface{}) *VirtualView {
	vv, err := New(model)
	if err != nil {
		panic(err)
	}
	return vv
}

// SetSourceDBColumns restricts SelectClause and OrderByClause to only build clauses over these
// specified db columns or fields calculated from these db columns. The restriction will be removed
// if nil is given.
// This is useful when the source table does not fully match the model, e.g. when there are extra
// fields in the model, this can avoid view to be broken.
//
// This function is concurrent-safe.
func (vv *VirtualView) SetSourceDBColumns(dbColumnNames []string) {
	vv.mu.Lock()
	vv.fullSchema.updateFieldsAvailability(dbColumnNames)
	vv.mu.Unlock()
}

func (vv *VirtualView) Clauses(jsonFieldNames []string) Clauses {
	m := map[string]struct{}{}
	for _, name := range jsonFieldNames {
		m[strings.ToLower(name)] = struct{}{}
	}
	return Clauses{
		vv:                vv,
		jsonFieldNames:    jsonFieldNames,
		jsonFieldsByNameL: m,
	}
}

type Clauses struct {
	vv                *VirtualView
	jsonFieldNames    []string
	jsonFieldsByNameL map[string]struct{}
}

// Select builds a Select clause that return all fields specified in Clauses().
//
// This function is concurrent-safe.
func (vvc Clauses) Select() clause.Expression {
	vvc.vv.mu.Lock()
	defer vvc.vv.mu.Unlock()

	selectColumns := make([]clause.Column, 0, len(vvc.jsonFieldNames))
	for _, fieldName := range vvc.jsonFieldNames {
		fieldNameL := strings.ToLower(fieldName)
		field := vvc.vv.fullSchema.fieldByJSONNameL[fieldNameL]
		if field == nil {
			// The specified JSON field does not exist in the schema, ignoring.
			continue
		}
		if field.isInvalid {
			// The field has already been filtered out using SetSourceDBColumns
			continue
		}
		if field.viewExpr == "" {
			// Not a computed field, just use the column name.
			selectColumns = append(selectColumns, clause.Column{
				Name: field.columnNameL,
			})
		} else {
			// Computed field, build SQL like:
			// SELECT PLUS(a,b) AS column_name, ...
			//        ^^^^^^^^^^^^^^^^^^^^^^^^
			selectColumns = append(selectColumns, clause.Column{
				Name: fmt.Sprintf("%s AS %s", field.viewExpr, field.columnNameL),
				Raw:  true,
			})
			// TODO: We'd better quote the alias field name.
		}
	}

	if len(selectColumns) == 0 {
		// Avoid becoming "SELECT *".
		selectColumns = append(selectColumns, clause.Column{
			Name: "NULL AS __HIDDEN_FIELD__",
			Raw:  true,
		})
	}

	return clause.Select{
		Distinct: false,
		Columns:  selectColumns,
	}
}

type OrderByField struct {
	JSONFieldName string `json:"json_field_name"`
	IsDesc        bool   `json:"is_desc"`
}

// OrderBy builds a Order By clause based on the given fields. Order by fields that do not exist
// when calling Clauses() will be ignored.
//
// This function is concurrent-safe.
func (vvc Clauses) OrderBy(fields []OrderByField) clause.Expression {
	vvc.vv.mu.Lock()
	defer vvc.vv.mu.Unlock()

	orderByColumns := make([]clause.OrderByColumn, 0, len(fields))
	for _, f := range fields {
		fieldNameL := strings.ToLower(f.JSONFieldName)
		if _, ok := vvc.jsonFieldsByNameL[fieldNameL]; !ok {
			// This field does not exist in the select clause. It should not be allowed to order by.
			continue
		}
		field := vvc.vv.fullSchema.fieldByJSONNameL[fieldNameL]
		if field == nil {
			continue
		}
		if field.isInvalid {
			continue
		}
		orderByColumns = append(orderByColumns, clause.OrderByColumn{
			Column: clause.Column{Name: field.columnNameL},
			Desc:   f.IsDesc,
		})
	}

	// If non of the order by field is valid, no ordering will be specified.
	if len(orderByColumns) == 0 {
		return nopClause{}
	}

	return clause.OrderBy{Columns: orderByColumns}
}

var (
	_ clause.Interface  = nopClause{}
	_ clause.Expression = nopClause{}
)

// nopClause is a clause that will be never embedded into the SQL statement.
type nopClause struct{}

func (c nopClause) Name() string {
	return "__DUMMY_CLAUSE__"
}

func (c nopClause) Build(_ clause.Builder) {}

func (c nopClause) MergeClause(_ *clause.Clause) {}
