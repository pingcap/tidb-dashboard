// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"reflect"
	"sync"
	"unsafe"
)

// KeyMap is used for string intern.
type KeyMap struct {
	sync.RWMutex
	sync.Map
}

// SaveKey interns a string.
func (km *KeyMap) SaveKey(key *string) {
	uniqueKey, _ := km.LoadOrStore(*key, *key)
	*key = uniqueKey.(string)
}

// SaveKeys interns all strings without using mutex.
func (km *KeyMap) SaveKeys(keys []string) {
	for i, key := range keys {
		uniqueKey, _ := km.LoadOrStore(key, key)
		keys[i] = uniqueKey.(string)
	}
}

func equal(keyA, keyB string) bool {
	pA := (*reflect.StringHeader)(unsafe.Pointer(&keyA)) // #nosec
	pB := (*reflect.StringHeader)(unsafe.Pointer(&keyB)) // #nosec
	return pA.Data == pB.Data && pA.Len == pB.Len
}
