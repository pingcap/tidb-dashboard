// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package nocopy

// NoCopy may be embedded into structs which must not be copied
// after the first use.
//
// See https://github.com/golang/go/issues/8005
type NoCopy struct{}

// Lock is a no-op used by -copylocks checker from `go vet`.
func (*NoCopy) Lock()   {}
func (*NoCopy) UnLock() {}
