// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package cryptoutil

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

func TestLegacyCiphertexts(t *testing.T) {
	// These fixtures were generated using the repository's pinned cryptopasta
	// revision 1f550f6f2f69, not by this implementation.
	data, err := os.ReadFile("testdata/legacy.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []struct{ Key, Plaintext, Ciphertext string }
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	for _, fixture := range fixtures {
		keyBytes, err := hex.DecodeString(fixture.Key)
		if err != nil {
			t.Fatal(err)
		}
		key := [32]byte(keyBytes)
		ciphertext, err := hex.DecodeString(fixture.Ciphertext)
		if err != nil {
			t.Fatal(err)
		}
		want, err := hex.DecodeString(fixture.Plaintext)
		if err != nil {
			t.Fatal(err)
		}
		got, err := Decrypt(ciphertext, &key)
		if err != nil || !bytes.Equal(want, got) {
			t.Fatalf("legacy decrypt: %x, %v", got, err)
		}
	}
}

func TestNewCiphertextsRetainLegacyLayout(t *testing.T) {
	key := NewKey()
	block, err := aes.NewCipher(key[:])
	if err != nil {
		t.Fatal(err)
	}
	// The old reader consumes a separate 12-byte nonce and 16-byte GCM tag.
	legacyReader, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	for _, plaintext := range [][]byte{nil, {}, []byte("synthetic password 密碼🔑"), bytes.Repeat([]byte{0xff}, 65536)} {
		ciphertext, err := Encrypt(plaintext, key)
		if err != nil {
			t.Fatal(err)
		}
		if len(ciphertext) != len(plaintext)+12+16 {
			t.Fatalf("ciphertext layout changed: %d", len(ciphertext))
		}
		got, err := legacyReader.Open(nil, ciphertext[:12], ciphertext[12:], nil)
		if err != nil || !bytes.Equal(plaintext, got) {
			t.Fatalf("legacy reader: %x, %v", got, err)
		}
		got, err = Decrypt(ciphertext, key)
		if err != nil || !bytes.Equal(plaintext, got) {
			t.Fatalf("round trip: %x, %v", got, err)
		}
		second, err := Encrypt(plaintext, key)
		if err != nil {
			t.Fatal(err)
		}
		if bytes.Equal(ciphertext[:12], second[:12]) {
			t.Fatal("nonce was reused")
		}
	}
}

func TestTamperingWrongKeysAndTruncationAreRejected(t *testing.T) {
	key := NewKey()
	ciphertext, err := Encrypt([]byte("synthetic-password"), key)
	if err != nil {
		t.Fatal(err)
	}
	for i := range ciphertext {
		altered := bytes.Clone(ciphertext)
		altered[i] ^= 1
		plaintext, err := Decrypt(altered, key)
		if err == nil || plaintext != nil {
			t.Fatalf("accepted modified byte %d", i)
		}
	}
	for length := range len(ciphertext) {
		plaintext, err := Decrypt(ciphertext[:length], key)
		if err == nil || plaintext != nil {
			t.Fatalf("accepted truncated ciphertext of length %d", length)
		}
	}
	plaintext, err := Decrypt(ciphertext, NewKey())
	if err == nil || plaintext != nil {
		t.Fatal("accepted the wrong key")
	}
}
