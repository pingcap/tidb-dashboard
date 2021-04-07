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

package statement

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/thoas/go-funk"
)

type TestStruct struct {
	AggDigestText string `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
	AggDigest     string `json:"digest" agg:"ANY_VALUE(digest)"`
}

// `{agg tag}` AS gorm.ToColumnName(`{struct field name}`)
var aggDigestTextMock string = "ANY_VALUE(digest_text) AS agg_digest_text"
var aggDigestMock string = "ANY_VALUE(digest) AS agg_digest"

var filterList []string = []string{"digest_text", "digest"}

func TestFilterFieldsBy_with_limited_filter_list(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		AggDigestText: "1",
		AggDigest:     "1",
	}, []string{"digest_text"})

	assert.Equal(t, fields, []string{aggDigestTextMock})
}

func TestFilterFieldsBy_with_allowlist(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		AggDigestText: "1",
		AggDigest:     "1",
	}, filterList, []string{"digest_text"}...)

	assert.Equal(t, fields, []string{aggDigestTextMock})
}

func TestFilterFieldsBy_without_allowlist(t *testing.T) {
	fields, _ := filterFieldsBy(TestStruct{
		AggDigestText: "1",
		AggDigest:     "1",
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{aggDigestTextMock, aggDigestMock}, funk.InnerJoin).([]string)) == len(fields))
}

var aggDigestCountMock string = "COUNT(DISTINCT digest) AS agg_digest_count"

func TestFilterFieldsBy_with_related_tag_field_struct(t *testing.T) {
	fields, _ := filterFieldsBy(struct {
		AggDigestText  string `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
		AggDigest      string `json:"digest" agg:"ANY_VALUE(digest)"`
		AggDigestCount int    `json:"digest_count" agg:"COUNT(DISTINCT digest)" related:"digest"`
	}{
		AggDigestText:  "1",
		AggDigest:      "1",
		AggDigestCount: 1,
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{aggDigestTextMock, aggDigestMock, aggDigestCountMock}, funk.InnerJoin).([]string)) == len(fields))
}

func TestFilterFieldsBy_unknow_field_without_related_tag_field_struct(t *testing.T) {
	fields, _ := filterFieldsBy(struct {
		AggDigestText  string `json:"digest_text" agg:"ANY_VALUE(digest_text)"`
		AggDigest      string `json:"digest" agg:"ANY_VALUE(digest)"`
		AggDigestCount int    `json:"digest_count" agg:"COUNT(DISTINCT digest)"`
	}{
		AggDigestText:  "1",
		AggDigest:      "1",
		AggDigestCount: 1,
	}, filterList)

	assert.Equal(t, true, len(funk.Join(fields, []string{aggDigestTextMock, aggDigestMock}, funk.InnerJoin).([]string)) == len(fields))
}
