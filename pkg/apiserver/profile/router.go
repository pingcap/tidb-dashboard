// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package profile

import (
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

// Service is used to provide a kind of feature.
type Service struct {
	config *config.Config
	db     *dbstore.DB
	tasks  sync.Map
}

// NewService creates a new service.
func NewService(config *config.Config, db *dbstore.DB) *Service {
	autoMigrate(db)
	return &Service{config: config, db: db, tasks: sync.Map{}}
}

// Register register the handlers to the service.
func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/profile")
	endpoint.Use(auth.MWAuthRequired())
	// support something like "/start?tikv=[]&tidb=[]&pd=[]"
	endpoint.GET("/group/start", s.startHandler)
	endpoint.GET("/group/status/:groupId", s.statusHandler)
	endpoint.POST("/group/cancel/:groupId", s.cancelGroupHandler)
	endpoint.POST("/single/cancel/:taskId", s.cancelHandler)
	endpoint.GET("/group/download/:groupId", s.downloadGroupHandler)
	endpoint.GET("/single/download/:taskId", s.downloadHandler)
}
