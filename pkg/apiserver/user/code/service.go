package code

import (
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gtank/cryptopasta"
	"github.com/joomcode/errorx"
	"github.com/vmihailenco/msgpack/v5"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

var (
	ErrNS          = errorx.NewNamespace("error.api.user.code")
	ErrShareFailed = ErrNS.NewType("share_failed")
)

const (
	// Max permitted lifetime of a shared session.
	MaxSessionShareExpiry = time.Hour * 24 * 30
)

type Service struct {
	sharingSecret *[32]byte
}

type sharedSession struct {
	Session         *utils.SessionUser
	ExpireAt        time.Time
	RevokeWritePriv bool
}

func newService() *Service {
	return &Service{
		sharingSecret: cryptopasta.NewEncryptionKey(),
	}
}

var Module = fx.Options(
	fx.Provide(newService),
	fx.Invoke(registerRouter),
)

func (s *Service) NewSessionFromSharingCode(codeInHex string) *utils.SessionUser {
	encrypted, err := hex.DecodeString(codeInHex)
	if err != nil {
		return nil
	}

	b, err := cryptopasta.Decrypt(encrypted, s.sharingSecret)
	if err != nil {
		return nil
	}

	var shared sharedSession
	if err := msgpack.Unmarshal(b, &shared); err != nil {
		return nil
	}

	if time.Now().After(shared.ExpireAt) {
		return nil
	}

	shared.Session.SharedSessionExpireAt = shared.ExpireAt
	shared.Session.DisplayName = fmt.Sprintf("Shared from %s", shared.Session.DisplayName)
	shared.Session.IsShareable = false
	if shared.RevokeWritePriv {
		shared.Session.IsWriteable = false
	}

	return shared.Session
}

func (s *Service) SharingCodeFromSession(session *utils.SessionUser, expireIn time.Duration, revokeWritePriv bool) *string {
	if !session.IsShareable {
		return nil
	}
	if expireIn < 0 {
		return nil
	}
	if expireIn > MaxSessionShareExpiry {
		return nil
	}

	shared := sharedSession{
		Session:         session,
		ExpireAt:        time.Now().Add(expireIn),
		RevokeWritePriv: revokeWritePriv,
	}

	b, err := msgpack.Marshal(&shared)
	if err != nil {
		// Do not output anything about how serialization is failed to avoid potential leaks.
		return nil
	}

	encrypted, err := cryptopasta.Encrypt(b, s.sharingSecret)
	if err != nil {
		return nil
	}

	codeInHex := hex.EncodeToString(encrypted)
	return &codeInHex
}
