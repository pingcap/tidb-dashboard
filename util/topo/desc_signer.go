// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"github.com/joomcode/errorx"
)

var (
	errSignerNS           = errorx.NewNamespace("topo.descriptor_signer")
	ErrSignerBadInput     = errSignerNS.NewType("bad_input")
	ErrSignerBadSignature = errSignerNS.NewType("bad_signature")
)

// CompDescriptorSigner signs and verifies a Component Desc.
type CompDescriptorSigner interface {
	// Sign creates a signed component descriptor.
	Sign(d *CompDescriptor) (SignedCompDescriptor, error)

	// Verify verifies whether a signed component descriptor is correctly signed.
	Verify(sd *SignedCompDescriptor) error
}
