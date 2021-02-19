package trace

import (
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type ServiceParams struct {
	fx.In
	LocalStore *dbstore.DB
}

type Service struct {
	params ServiceParams
}

func NewService(p ServiceParams) *Service {
	err := autoMigrate(p.LocalStore)
	if err != nil {
		log.Fatal("Failed to initialize database", zap.Error(err))
	}
	return &Service{params: p}
}
