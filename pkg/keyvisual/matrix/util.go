// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"sort"
)

// MemsetUint64 sets all elements of the uint64 slice to v.
func MemsetUint64(slice []uint64, v uint64) {
	sliceLen := len(slice)
	if sliceLen == 0 {
		return
	}
	slice[0] = v
	for bp := 1; bp < sliceLen; bp <<= 1 {
		copy(slice[bp:], slice[:bp])
	}
}

// MemsetInt sets all elements of the int slice to v.
func MemsetInt(slice []int, v int) {
	sliceLen := len(slice)
	if sliceLen == 0 {
		return
	}
	slice[0] = v
	for bp := 1; bp < sliceLen; bp <<= 1 {
		copy(slice[bp:], slice[:bp])
	}
}

// GetLastKey gets the last element of keys.
func GetLastKey(keys []string) string {
	return keys[len(keys)-1]
}

// CheckPartOf checks that part keys are a subset of src keys.
func CheckPartOf(src, part []string) {
	err := src[0] > part[0] || len(src) < len(part)
	srcLastKey := GetLastKey(src)
	partLastKey := GetLastKey(part)
	if srcLastKey != "" && (partLastKey == "" || srcLastKey < partLastKey) {
		err = true
	}
	if err {
		panic("The inclusion relationship is not satisfied between keys")
	}
}

// CheckReduceOf checks that part keys are a subset of src keys and have the same StartKey and EndKey.
func CheckReduceOf(src, part []string) {
	if src[0] != part[0] || GetLastKey(src) != GetLastKey(part) || len(src) < len(part) {
		panic("The inclusion relationship is not satisfied between keys")
	}
}

// MakeKeys uses a key set to build a new Key-Axis.
func MakeKeys(keySet map[string]struct{}) []string {
	keysLen := len(keySet)
	keys := make([]string, keysLen, keysLen+1)
	i := 0
	for key := range keySet {
		keys[i] = key
		i++
	}
	sort.Strings(keys)
	return keys
}

// MakeKeysWithUnlimitedEnd uses a key set to build a new Key-Axis, then add a "" to the keys, indicating that the last
// bucket has an unlimited end.
func MakeKeysWithUnlimitedEnd(keySet map[string]struct{}) []string {
	keys := MakeKeys(keySet)
	return append(keys, "")
}

// KeysRange finds a range that intersects [startKey, endKey) in keys.
func KeysRange(keys []string, startKey string, endKey string) (start, end int, ok bool) {
	if endKey != "" && startKey >= endKey {
		panic("StartKey must be less than EndKey")
	}

	// ensure intersection
	if endKey != "" && endKey <= keys[0] {
		return -1, -1, false
	}
	axisEndKey := GetLastKey(keys)
	if axisEndKey != "" && startKey >= axisEndKey {
		return -1, -1, false
	}

	keysLen := len(keys)
	sortedKeysLen := keysLen
	if axisEndKey == "" {
		sortedKeysLen--
	}

	// start index (contain)
	start = sort.Search(sortedKeysLen, func(i int) bool {
		return keys[i] > startKey
	})
	if start > 0 {
		start--
	}

	// end index (contain)
	end = keysLen
	if endKey != "" {
		end = sort.Search(sortedKeysLen, func(i int) bool {
			return keys[i] >= endKey
		})
		if end < keysLen {
			end++
		}
	}

	return start, end, true
}

// Max returns the larger of a and b.
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Min returns the smaller of a and b.
func Min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
