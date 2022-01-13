// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"encoding/hex"

	"github.com/gtank/cryptopasta"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

// HS256Signer is a signer that use HS256 jwt to sign and verify the component list.
type HS256Signer struct {
	secret *[32]byte
}

var _ CompDescriptorSigner = &HS256Signer{}

func NewHS256Signer() CompDescriptorSigner {
	return &HS256Signer{
		secret: cryptopasta.NewHMACKey(),
	}
}

func (s *HS256Signer) serializeMessage(d *CompDescriptor) ([]byte, error) {
	return jsonserde.Default.Marshal(d)
}

func (s *HS256Signer) Sign(d *CompDescriptor) (SignedCompDescriptor, error) {
	if d == nil {
		return SignedCompDescriptor{}, ErrSignerBadInput.New("input is nil")
	}
	message, err := s.serializeMessage(d)
	if err != nil {
		return SignedCompDescriptor{}, ErrSignerBadInput.WrapWithNoMessage(err)
	}
	signature := cryptopasta.GenerateHMAC(message, s.secret)
	return SignedCompDescriptor{
		CompDescriptor: *d,
		Signature:      hex.EncodeToString(signature),
	}, nil
}

func (s *HS256Signer) Verify(sd *SignedCompDescriptor) error {
	if sd == nil {
		return ErrSignerBadInput.New("input is nil")
	}
	signature, err := hex.DecodeString(sd.Signature)
	if err != nil {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	message, err := s.serializeMessage(&sd.CompDescriptor)
	if err != nil {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	if !cryptopasta.CheckHMAC(message, signature, s.secret) {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	return nil
}
