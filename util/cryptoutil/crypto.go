// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

// Package cryptoutil provides the authenticated encryption used by Dashboard.
package cryptoutil

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
)

// NewKey generates a random 256-bit encryption or signing key.
// Failure to obtain secure randomness must stop key creation.
func NewKey() *[32]byte {
	key := new([32]byte)
	if _, err := rand.Read(key[:]); err != nil {
		panic(err)
	}
	return key
}

// newAEAD retains the legacy AES-256-GCM format: a 12-byte random nonce,
// followed by ciphertext and a 16-byte authentication tag. The standard
// library generates and prepends the nonce and extracts it when decrypting.
func newAEAD(key *[32]byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	return cipher.NewGCMWithRandomNonce(block)
}

// Encrypt authenticates plaintext and returns nonce|ciphertext|tag.
func Encrypt(plaintext []byte, key *[32]byte) ([]byte, error) {
	aead, err := newAEAD(key)
	if err != nil {
		return nil, err
	}
	//nolint:gosec // G407: NewGCMWithRandomNonce generates the nonce; Seal requires an empty nonce argument.
	return aead.Seal(nil, nil, plaintext, nil), nil
}

// Decrypt authenticates nonce|ciphertext|tag before returning plaintext.
func Decrypt(ciphertext []byte, key *[32]byte) ([]byte, error) {
	aead, err := newAEAD(key)
	if err != nil {
		return nil, err
	}
	return aead.Open(nil, nil, ciphertext, nil)
}
