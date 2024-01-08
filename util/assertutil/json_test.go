// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package assertutil

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestJSONContains(t *testing.T) {
	mockT := new(mockTestingT)
	require.False(t, JSONContains(mockT, `null`, `{"a":1}`))
	require.Contains(t, mockT.errorString(), `Src ('null') does not contain '{"a":1}'`)

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `null`, `null`))

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `null`, `{}`))

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"a":1}`, `{"a":1}`))

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"a":1}`, `null`))

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `nullx`, `{"a":1}`))
	require.Contains(t, mockT.errorString(), `Src value ('nullx') is not a valid json object string`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":1}`, `nullx`))
	require.Contains(t, mockT.errorString(), `Contained value ('nullx') is not a valid json object string`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"b":1}`, `{"a":1}`))
	require.Contains(t, mockT.errorString(), `Src ('{"b":1}') does not contain '{"a":1}'`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":1}`, `{"b":1}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":1}') does not contain '{"b":1}'`)

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"a":1,"b":2}`, `{"a":1}`))

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"b":2,"a":1}`, `{"a":1}`))

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"a":1,"b":2}`, `{"b":2,"a":1}`))

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":1}`, `{"a":1,"b":2}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":1}') does not contain '{"a":1,"b":2}'`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":2,"b":2}`, `{"a":1}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":2,"b":2}') does not contain '{"a":1}'`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":1}`, `{"A":1}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":1}') does not contain '{"A":1}'`)

	mockT = new(mockTestingT)
	require.True(t, JSONContains(mockT, `{"a":{"foo":"bar"},"b":2}`, `{"a":{"foo":"bar"}}`))

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":{"foo":"bar"},"b":2}`, `{"a":1}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":{"foo":"bar"},"b":2}') does not contain '{"a":1}'`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":{"foo":"bar"},"b":2}`, `{"a":{"foo":"box"}}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":{"foo":"bar"},"b":2}') does not contain '{"a":{"foo":"box"}}'`)

	mockT = new(mockTestingT)
	require.False(t, JSONContains(mockT, `{"a":{"foo":"bar"},"b":2}`, `{"a":{"FOO":"bar"}}`))
	require.Contains(t, mockT.errorString(), `Src ('{"a":{"foo":"bar"},"b":2}') does not contain '{"a":{"FOO":"bar"}}'`)
}
