// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package ginadapter

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestJSONBindingBindBody(t *testing.T) {
	type sampleStruct struct {
		ABCFoo string
		Bar    string
		Box    string `json:"_box"`
	}
	var s sampleStruct
	err := jsonBinding{}.BindBody([]byte(`{"Abc_foo": "FOO", "Box": "zzz", "Bar": "xyz"}`), &s)
	require.NoError(t, err)
	require.Equal(t, "FOO", s.ABCFoo)
	require.Equal(t, "xyz", s.Bar)
	require.Equal(t, "", s.Box)

	s = sampleStruct{}
	err = jsonBinding{}.BindBody([]byte(`{"ABCFoo": "z", "_Box": "yo"}`), &s)
	require.NoError(t, err)
	require.Equal(t, "", s.ABCFoo)
	require.Equal(t, "", s.Bar)
	require.Equal(t, "yo", s.Box)

	s = sampleStruct{}
	err = jsonBinding{}.BindBody([]byte(`{"abc_foo": "x", "_box": "yoo", "bar": "jojo"}`), &s)
	require.NoError(t, err)
	require.Equal(t, "x", s.ABCFoo)
	require.Equal(t, "jojo", s.Bar)
	require.Equal(t, "yoo", s.Box)
}

func TestJSONBindingBindBodyMap(t *testing.T) {
	s := make(map[string]string)
	err := jsonBinding{}.BindBody([]byte(`{"foo": "FOO","Hello":"world"}`), &s)
	require.NoError(t, err)
	require.Len(t, s, 2)
	require.Equal(t, "FOO", s["foo"])
	require.Equal(t, "world", s["Hello"])
}
