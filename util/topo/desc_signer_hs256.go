// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"encoding/hex"

	"github.com/gtank/cryptopasta"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

// CompDescHS256Signer is a signer that use HS256 jwt to sign and verify the component list.
type CompDescHS256Signer struct {
	secret *[32]byte
}

var _ CompDescSigner = &CompDescHS256Signer{}

func NewHS256CompDescSigner() CompDescSigner {
	return &CompDescHS256Signer{
		secret: cryptopasta.NewHMACKey(),
	}
}

func (s *CompDescHS256Signer) serializeMessage(d *CompDesc) ([]byte, error) {
	return jsonserde.Default.Marshal(d)
}

func (s *CompDescHS256Signer) Sign(d *CompDesc) (SignedCompDesc, error) {
	if d == nil {
		return SignedCompDesc{}, ErrSignerBadInput.New("input is nil")
	}
	message, err := s.serializeMessage(d)
	if err != nil {
		return SignedCompDesc{}, ErrSignerBadInput.WrapWithNoMessage(err)
	}
	signature := cryptopasta.GenerateHMAC(message, s.secret)
	return SignedCompDesc{
		CompDesc:  *d,
		Signature: hex.EncodeToString(signature),
	}, nil
}

func (s *CompDescHS256Signer) Verify(sd *SignedCompDesc) error {
	if sd == nil {
		return ErrSignerBadInput.New("input is nil")
	}
	signature, err := hex.DecodeString(sd.Signature)
	if err != nil {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	message, err := s.serializeMessage(&sd.CompDesc)
	if err != nil {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	if !cryptopasta.CheckHMAC(message, signature, s.secret) {
		return ErrSignerBadSignature.NewWithNoMessage()
	}
	return nil
}
