// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2012-2020 Mat Ryer, Tyler Bunnell and contributors.

package assertutil

import (
	"encoding/json"
	"fmt"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func JSONContains(t assert.TestingT, src string, contains string, msgAndArgs ...interface{}) bool {
	var srcJSONMap, containedJSONMap map[string]interface{}

	if err := json.Unmarshal([]byte(src), &srcJSONMap); err != nil {
		return assert.Fail(t, fmt.Sprintf("Src value ('%s') is not a valid json object string.\nJSON parsing error: '%s'", src, err.Error()), msgAndArgs...)
	}

	if err := json.Unmarshal([]byte(contains), &containedJSONMap); err != nil {
		return assert.Fail(t, fmt.Sprintf("Contained value ('%s') is not a valid json object string.\nJSON parsing error: '%s'", contains, err.Error()), msgAndArgs...)
	}

	for key, value := range containedJSONMap {
		srcValue, ok := srcJSONMap[key]
		if !ok || !assert.ObjectsAreEqual(srcValue, value) {
			return assert.Fail(t, fmt.Sprintf("Src ('%s') does not contain '%s'", src, contains), msgAndArgs...)
		}
	}

	return true
}

func RequireJSONContains(t require.TestingT, src string, contains string, msgAndArgs ...interface{}) {
	if JSONContains(t, src, contains, msgAndArgs...) {
		return
	}
	t.FailNow()
}
