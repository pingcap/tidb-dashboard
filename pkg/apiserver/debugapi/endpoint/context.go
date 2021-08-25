// Copyright 2021 PingCAP, Inc.
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

package endpoint

// Context is design for request transform process
type Context struct {
	ParamName   string
	paramValues Values
}

// Value return current param's value
func (c *Context) Value() string {
	return c.paramValues.Get(c.ParamName)
}

func (c *Context) SetValue(val string) {
	c.paramValues.Set(c.ParamName, val)
}

// Values return current param's multiple values
func (c *Context) Values() []string {
	return c.paramValues[c.ParamName]
}

func (c *Context) SetValues(vals []string) {
	c.paramValues.Del(c.ParamName)
	for _, v := range vals {
		c.paramValues.Add(c.ParamName, v)
	}
}

// ParamValue return param's value with the given key
func (c *Context) ParamValue(key string) string {
	return c.paramValues.Get(key)
}

// ParamValues return param's multiple values with the given key
func (c *Context) ParamValues(key string) []string {
	return c.paramValues[c.ParamName]
}

// Values maps a string key to a list of values.
type Values map[string][]string

// Get gets the first value associated with the given key.
// If there are no values associated with the key, Get returns
// the empty string. To access multiple values, use the map
// directly.
func (v Values) Get(key string) string {
	if v == nil {
		return ""
	}
	vs := v[key]
	if len(vs) == 0 {
		return ""
	}
	return vs[0]
}

// Set sets the key to value. It replaces any existing
// values.
func (v Values) Set(key, value string) {
	v[key] = []string{value}
}

// Add adds the value to key. It appends to any existing
// values associated with key.
func (v Values) Add(key, value string) {
	v[key] = append(v[key], value)
}

// Del deletes the values associated with key.
func (v Values) Del(key string) {
	delete(v, key)
}
