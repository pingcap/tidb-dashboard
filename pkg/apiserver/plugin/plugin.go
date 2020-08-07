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

package plugin

import (
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/plugin"
)

var (
	errPluginNotFound     = utils.ErrNS.NewType("plugin_not_found", errorx.NotFound())
	errPluginNotInstalled = utils.ErrNS.NewType("plugin_not_installed", errorx.NotFound())
)

type Service struct {
	lifecycleCtx context.Context
	config       *config.Config
	plugins      sync.Map // concurrent map[string]*plugin.Plugin
}

func NewService(lc fx.Lifecycle, config *config.Config) *Service {
	s := &Service{config: config}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
		OnStop: func(ctx context.Context) error {
			s.plugins.Range(func(name interface{}, rawPlugin interface{}) bool {
				rawPlugin.(*plugin.Plugin).Uninstall()
				return true
			})
			return nil
		},
	})
	return s
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/plugin")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/", s.listPlugins)
	endpoint.PUT("/:name", s.installPlugin)
	endpoint.DELETE("/:name", s.uninstallPlugin)

	endpoint = r.Group("/plugin-do")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Any("/:name/*actions", s.do)
}

// @Summary List plugins
// @Description List all plugins found in the plugin directory.
// @Security JwtAuth
// @Produce json
// @Success 200 {object} []plugin.Info
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
// @Router /plugin [get]
func (s *Service) listPlugins(c *gin.Context) {
	infos, err := plugin.ListPlugins(s.config.PluginDir)
	if err != nil {
		_ = c.Error(err)
		return
	}

	for _, info := range infos {
		if p, ok := s.plugins.Load(info.Name); ok {
			info.State = p.(*plugin.Plugin).State()
		}
	}

	c.JSON(http.StatusOK, infos)
}

// @Summary Install plugin
// @Description Install a plugin given the plugin file name
// @Security JwtAuth
// @Param name path string true "plugin file name (xxxxxx.zip)"
// @Produce json
// @Success 200 "installed"
// @Success 202 "already installing"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 404 {object} utils.APIError "plugin not found"
// @Failure 500 {object} utils.APIError
// @Router /plugin/{name} [put]
func (s *Service) installPlugin(c *gin.Context) {
	name := c.Param("name")
	rawPlugin, ok := s.plugins.LoadOrStore(name, new(plugin.Plugin))
	p := rawPlugin.(*plugin.Plugin)

	if ok {
		// if `p` already exists in the plugins map, either the plugin has
		// already been installed (return 200) or another installation process
		// is running (return 202).
		if p.State() == plugin.InstallStateInstalled {
			c.JSON(http.StatusOK, "already installed")
		} else {
			c.JSON(http.StatusAccepted, "installation in process")
		}
		return
	}

	// (at this point we should be the only goroutine having access to `p`)

	defer func() {
		// if installation failed, delete the placeholder entry.
		if p != nil {
			s.plugins.Delete(name)
		}
	}()

	path := filepath.Join(s.config.PluginDir, name+".zip")
	stat, err := os.Stat(path)
	if os.IsNotExist(err) || stat.IsDir() {
		c.Status(http.StatusNotFound)
		_ = c.Error(errPluginNotFound.New(name))
		return
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, 15*time.Second)
	defer cancel()

	if err = p.Install(ctx, s.config, name); err != nil {
		_ = c.Error(err)
		return
	}

	p = nil
	c.JSON(http.StatusOK, "installed")
}

// @Summary Uninstall plugin
// @Description Uninstall a plugin given the plugin file name
// @Param name path string true "plugin file name (xxxxxx)"
// @Produce json
// @Success 200 "uninstalled"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /plugin/{name} [delete]
func (s *Service) uninstallPlugin(c *gin.Context) {
	name := c.Param("name")
	rawPlugin, ok := s.plugins.Load(name)
	if ok {
		s.plugins.Delete(name)
		rawPlugin.(*plugin.Plugin).Uninstall()
	}
	c.JSON(http.StatusOK, "uninstalled")
}

// @Summary Do plugin-defined actions
// @Description Forwards the entire request to the plugin.
// @Param name path string true "plugin file name"
// @Produce octet-stream
// @Failure 404 {object} utils.APIError "plugin not found"
// @Router /plugin-do/{name}/... [any]
func (s *Service) do(c *gin.Context) {
	name := c.Param("name")
	rawPlugin, ok := s.plugins.Load(name)
	if !ok {
		c.Status(http.StatusNotFound)
		_ = c.Error(errPluginNotInstalled.New(name))
		return
	}
	p := rawPlugin.(*plugin.Plugin)
	if p.State() != plugin.InstallStateInstalled {
		c.Status(http.StatusNotFound)
		_ = c.Error(errPluginNotInstalled.New(name))
		return
	}

	// strip the first 4 components (/dashboard/api/plugin-do/<plugin>/) from the path
	components := strings.SplitN(c.Request.URL.Path, "/", 6)
	if len(components) == 6 {
		c.Request.URL.Path = "/" + components[5]
	} else {
		c.Request.URL.Path = "/"
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, 30*time.Second)
	defer cancel()

	resp, err := p.ForwardHTTP(c.Request.WithContext(ctx))
	if err != nil {
		_ = c.Error(err)
		return
	}
	defer resp.Body.Close()

	targetHeaders := c.Writer.Header()
	for srcKey, srcHeaders := range resp.Header {
		targetHeaders[srcKey] = srcHeaders
	}
	c.Writer.WriteHeader(resp.StatusCode)
	if _, err = io.Copy(c.Writer, resp.Body); err != nil {
		log.Debug("failed to copy plugin HTTP response back to host", zap.Error(err))
	}
	c.Writer.Flush()
}
