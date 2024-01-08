// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
)

// Generate RSA private/public key.
func GenerateKey() (*rsa.PrivateKey, *rsa.PublicKey, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}

	publicKey := &privateKey.PublicKey
	return privateKey, publicKey, nil
}

// Export public key to string
// Output format:
// -----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA67F1RPMUO4SjARRe4UfX
// J7ZOCbcysna0jx2Av14KteGo6AWFHhuIxZwgp83GDqFv0Dhc/be7n+9V5vfq0Ob4
// fUtdjBio5ciF4pcqzVGbddfJ0R2e52DF6TI2pDgUFdN+1bmGDwZOCyrwBvVh0wW2
// jAI+QfQyRimZOMqFeX97XjW32vGk7cxNYMys9ExyJcfzfLanbzOwp6kdNbPXnYtU
// Y2nmp+evlPKrRzBPnmO0bpZhYHklrRxLo/u/mThysMEttLkgzCare+JPQyb3z3Si
// Q2E7WG4yz6+6L/wB4etHDfRljMOtqEwv9z4inUfh5716Mg23Div/AbwqGPiKPZf7
// cQIDAQAB
// -----END PUBLIC KEY-----.
func ExportPublicKeyAsString(publicKey *rsa.PublicKey) (string, error) {
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return "", err
	}

	publicKeyPEM := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	}

	publicKeyString := string(pem.EncodeToMemory(publicKeyPEM))

	return publicKeyString, nil
}

// Dump public key to base64 string
//  1. Have no header/tailer line
//  2. Key content is merged into one-line format
//
// The output is:
//
//	MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2y8mEdCRE8siiI7udpge......2QIDAQAB
func DumpPublicKeyBase64(publicKey *rsa.PublicKey) (string, error) {
	keyBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return "", err
	}

	keyBase64 := base64.StdEncoding.EncodeToString(keyBytes)
	return keyBase64, nil
}

// Dump private key to base64 string
//  1. Have no header/tailer line
//  2. Key content is merged into one-line format
//
// The output is:
//
//	MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2y8mEdCRE8siiI7udpge......2QIDAQAB
func DumpPrivateKeyBase64(privatekey *rsa.PrivateKey) (string, error) {
	keyBytes := x509.MarshalPKCS1PrivateKey(privatekey)

	keyBase64 := base64.StdEncoding.EncodeToString(keyBytes)
	return keyBase64, nil
}

// Encrypt by public key.
func Encrypt(plainText string, publicKey *rsa.PublicKey) (string, error) {
	encryptedText, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, []byte(plainText))
	if err != nil {
		return "", err
	}

	// the encryptedText is encoded by base64 in the frontend by jsEncrypt
	encodedText := base64.StdEncoding.EncodeToString(encryptedText)
	return encodedText, nil
}

// Decrypt by private key.
func Decrypt(cipherText string, privateKey *rsa.PrivateKey) (string, error) {
	// the cipherText is encoded by base64 in the frontend by jsEncrypt
	decodedText, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", err
	}

	decryptedText, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, decodedText)
	if err != nil {
		return "", err
	}

	return string(decryptedText), nil
}
