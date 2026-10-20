// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"encoding/hex"
	"errors"

	"github.com/google/uuid"
	"github.com/gtank/cryptopasta"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

// IsSessionValid also applies to sessions derived from an SSO sharing code.
func (s *Service) IsSessionValid(u *utils.SessionUser) bool {
	// Config snapshots and database reads are synchronized independently. Revision
	// checks below keep validation safe without waiting for in-flight IdP calls.
	dc, err := s.configManager.Get()
	if err != nil || !dc.SSO.CoreConfig.Enabled || u.SSOConfigRevision == "" || u.SSOConfigRevision != dc.SSO.Revision {
		return false
	}
	// Also reject stale config snapshots and partial SQLite/etcd writes. A config
	// rollback must not resurrect sessions whose delegation has already changed.
	var imp SSOImpersonationModel
	return s.params.LocalStore.First(&imp).Error == nil &&
		imp.ConfigRevision == u.SSOConfigRevision && imp.SQLUser == u.TiDBUsername
}

func (s *Service) saveConfig(req SetConfigRequest) (*SSOImpersonationModel, error) {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	return s.saveConfigLocked(req)
}

// Kept for API compatibility. Reauthorizing the current config also revokes old sessions.
func (s *Service) createImpersonation(name, password string) (*SSOImpersonationModel, error) {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	dc, err := s.configManager.Get()
	if err != nil {
		return nil, err
	}
	if !dc.SSO.CoreConfig.Enabled {
		return nil, ErrBadConfig.New("Submit SSO configuration and SQL credentials together")
	}
	return s.saveConfigLocked(SetConfigRequest{Config: dc.SSO.CoreConfig, SQLUser: name, Password: password})
}

func (s *Service) saveConfigLocked(req SetConfigRequest) (*SSOImpersonationModel, error) {
	if req.SQLUser == "" {
		return nil, rest.ErrBadRequest.New("SQL credentials are required")
	}
	// Knowledge of a less privileged SQL password must not authorize reuse or replacement
	// of an existing privileged delegation. Disable it with its own credentials first.
	var previous SSOImpersonationModel
	err := s.params.LocalStore.First(&previous).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if err == nil && previous.SQLUser != req.SQLUser {
		return nil, rest.ErrForbidden.New("Reauthorize using the currently impersonated SQL user")
	}
	if _, err := s.verifySQLUser(req.SQLUser, req.Password); err != nil {
		return nil, ErrInvalidImpersonateCredential.Wrap(err, "Invalid SQL credential or insufficient privileges")
	}

	dConfig := config.SSOConfig{CoreConfig: req.Config, Revision: uuid.NewString()}
	var record *SSOImpersonationModel
	if req.Config.Enabled {
		if req.Config.ClientID == "" {
			return nil, rest.ErrBadRequest.New("OIDC client ID is required")
		}
		wellKnown, err := s.discoverOIDC(req.Config.DiscoveryURL)
		if err != nil {
			return nil, rest.ErrBadRequest.WrapWithNoMessage(err)
		}
		dConfig.Issuer = wellKnown.Issuer
		dConfig.JWKSURL = wellKnown.JWKSURI
		dConfig.SigningAlgs = wellKnown.IDTokenSigningAlgValuesSupported
		dConfig.AuthURL = wellKnown.AuthURL
		dConfig.TokenURL = wellKnown.TokenURL
		dConfig.UserInfoURL = wellKnown.UserInfoURL
		dConfig.SignOutURL = wellKnown.EndSessionURL

		key, err := s.getOrCreateMasterEncKey()
		if err != nil {
			return nil, err
		}
		encrypted, err := cryptopasta.Encrypt([]byte(req.Password), key)
		if err != nil {
			return nil, err
		}
		record = &SSOImpersonationModel{
			SQLUser: req.SQLUser, EncryptedPass: hex.EncodeToString(encrypted), ConfigRevision: dConfig.Revision,
		}
	}

	// SQLite and etcd cannot share a transaction. Publish matching credentials first;
	// a failed config write leaves a revision mismatch, which refuses all SSO logins.
	if err := s.params.LocalStore.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM sso_impersonation").Error; err != nil {
			return err
		}
		if record != nil {
			return tx.Create(record).Error
		}
		return nil
	}); err != nil {
		return nil, err
	}
	if err := s.configManager.Modify(func(dc *config.DynamicConfig) { dc.SSO = dConfig }); err != nil {
		return nil, err
	}
	return record, nil
}
