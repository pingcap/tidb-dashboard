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

package utils

import "github.com/oleiade/reflections"

// GetFieldTags specify the tag data to be retrieved from `from` by the tag of the `to` structure
func GetFieldTags(from interface{}, to interface{}) (TagMap, error) {
	retrieveTags, err := reflections.Tags(to, "tag")
	if err != nil {
		return nil, err
	}
	fields, err := reflections.Fields(from)
	if err != nil {
		return nil, err
	}

	tagMap := TagMap{}
	for _, fieldName := range fields {
		f := map[string]string{}
		for key, tagKey := range retrieveTags {
			if err != nil {
				continue
			}
			tagVal, err2 := reflections.GetFieldTag(from, fieldName, tagKey)
			if err2 != nil {
				err = err2
				continue
			}
			f[key] = tagVal
		}
		tagMap[fieldName] = f
	}
	if err != nil {
		return nil, err
	}

	return tagMap, nil
}

type TagMap map[string]map[string]string

func (m *TagMap) Filter(predicate func(k string, m map[string]string) bool) TagMap {
	rst := TagMap{}
	for key, val := range *m {
		ok := predicate(key, val)
		if !ok {
			continue
		}
		rst[key] = val
	}
	return rst
}
