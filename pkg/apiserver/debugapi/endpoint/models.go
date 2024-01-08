// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"encoding/hex"
	"fmt"
	"strconv"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// APIDefinition defines what an API endpoints accepts.
// APIDefinition can be "resolved" to become a request when its parameter values are given via RequestPayload.
type APIDefinition struct {
	ID          string               `json:"id"`
	Component   topo.Kind            `json:"component"`
	Path        string               `json:"path"`
	Method      string               `json:"method"`
	PathParams  []APIParamDefinition `json:"path_params"`  // e.g. /stats/dump/{db}/{table} -> db, table
	QueryParams []APIParamDefinition `json:"query_params"` // e.g. /debug/pprof?seconds=1 -> seconds

	BeforeSendRequest func(req *httpclient.LazyRequest) `json:"-"`
}

type APIParamResolveFn func(value string) ([]string, error)

// APIParamDefinition defines what an API endpoint parameter accepts and how it should look like in the UI.
// Usually this struct doesn't need to be manually constructed. Use APIParamXxx() helpers.
type APIParamDefinition struct {
	Name             string            `json:"name"`
	Required         bool              `json:"required"`
	UIComponentKind  string            `json:"ui_kind"`
	UIComponentProps interface{}       `json:"ui_props"` // varies by different ui kinds
	OnResolve        APIParamResolveFn `json:"-"`
}

func (d *APIParamDefinition) Resolve(value string) ([]string, error) {
	if d.OnResolve == nil {
		return []string{value}, nil
	}
	return d.OnResolve(value)
}

// UIComponentTextProps is the type of UIComponentProps when UIComponentKind is "text".
type UIComponentTextProps struct {
	Placeholder string `json:"placeholder"`
	DefaultVal  string `json:"default_val"`
}

func APIParamText(name string, required bool) APIParamDefinition {
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "text",
	}
}

func APIParamInt(name string, required bool) APIParamDefinition {
	return APIParamIntWithDefaultVal(name, required, "")
}

func APIParamIntWithDefaultVal(name string, required bool, defVal string) APIParamDefinition {
	placeHolder := "(int)"
	if defVal != "" {
		placeHolder = fmt.Sprintf("(int, default: %s)", defVal)
	}
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "text",
		UIComponentProps: UIComponentTextProps{
			Placeholder: placeHolder,
			DefaultVal:  defVal,
		},
		OnResolve: func(value string) ([]string, error) {
			if _, err := strconv.Atoi(value); err != nil {
				return nil, fmt.Errorf("'%s' is not a int", value)
			}
			return []string{value}, nil
		},
	}
}

func APIParamDBName(name string, required bool) APIParamDefinition {
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "db_dropdown",
	}
}

func APIParamTableName(name string, required bool) APIParamDefinition {
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "table_dropdown",
	}
}

func APIParamTableID(name string, required bool) APIParamDefinition {
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "table_id_dropdown",
	}
}

// UIComponentDropdownProps is the type of UIComponentProps when UIComponentKind is "dropdown".
type UIComponentDropdownProps struct {
	Items []EnumItemDefinition `json:"items"`
}

type EnumItemDefinition struct {
	Value     string `json:"value"`
	DisplayAs string `json:"display_as"` // Optional
}

func APIParamEnum(name string, required bool, items []EnumItemDefinition) APIParamDefinition {
	return APIParamDefinition{
		Name:             name,
		Required:         required,
		UIComponentKind:  "dropdown",
		UIComponentProps: UIComponentDropdownProps{Items: items},
		OnResolve: func(value string) ([]string, error) {
			for _, item := range items {
				if item.Value == value {
					return []string{value}, nil
				}
			}
			return nil, fmt.Errorf("'%s' is not a valid enum value", value)
		},
	}
}

// Below are some special API param kinds.

func APIParamPDKey(name string, required bool) APIParamDefinition {
	return APIParamDefinition{
		Name:            name,
		Required:        required,
		UIComponentKind: "text",
		UIComponentProps: UIComponentTextProps{
			Placeholder: "(hex key, e.g. 748000...)",
		},
		OnResolve: func(value string) ([]string, error) {
			keyBinary, err := hex.DecodeString(value)
			if err != nil {
				return nil, fmt.Errorf("'%s' is not a valid hex key", value)
			}
			return []string{string(keyBinary)}, nil
		},
	}
}
