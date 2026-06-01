package vaulttransfer

import (
	"crypto/rand"
	"encoding/base64"
)

func randomSaltBase64() (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(salt), nil
}
