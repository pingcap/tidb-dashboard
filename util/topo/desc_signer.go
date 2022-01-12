// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"github.com/joomcode/errorx"
)

var (
	errSignerNS           = errorx.NewNamespace("topo.desc_signer")
	ErrSignerBadInput     = errSignerNS.NewType("bad_input")
	ErrSignerBadSignature = errSignerNS.NewType("bad_signature")
)

// CompDescSigner signs and verifies a Component Descriptor.
type CompDescSigner interface {
	// Sign creates a signed component descriptor.
	Sign(d *CompDesc) (SignedCompDesc, error)

	// Verify verifies whether a signed component descriptor is correctly signed.
	Verify(sd *SignedCompDesc) error
}
