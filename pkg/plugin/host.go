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

// host.go defines some host-specific plugin functions.

package plugin

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"

	"github.com/BurntSushi/toml"
	"github.com/hashicorp/go-plugin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

// pluginFileName is the expected plugin name in the zip file for the current platform.
var pluginFileName = fmt.Sprintf("plugin-%s-%s.exe", runtime.GOOS, runtime.GOARCH)

// Manifest is the metadata associated with the plugin.
type Manifest struct {
	Name        string   `json:"name" toml:"name"`
	Types       []string `json:"types" toml:"types"`
	Version     string   `json:"version" toml:"version"`
	Author      string   `json:"author" toml:"author"`
	License     string   `json:"license" toml:"license"`
	Description string   `json:"description" toml:"description"`
	// TODO support propriety license files.
}

// Info is the plugin information returned by ListPlugins
type Info struct {
	Manifest `json:"manifest"`
	Name     string       `json:"name"`
	State    InstallState `json:"state"`
	Icon     struct {
		ContentType string `json:"content-type"`
		Body        []byte `json:"body"`
	} `json:"icon"`
}

// InstallState is the installation state of the plugin.
type InstallState uint32

const (
	// InstallStateUninstalled is the state where the plugin was not installed
	// or has been uninstalled.
	InstallStateUninstalled InstallState = iota

	// InstallStateDecompressed is the state where the plugin has been
	// decompressed but not when run.
	InstallStateDecompressed

	// InstallStateDecompressed is the state where the plugin has started but
	// not yet initialized.
	InstallStateExecuted

	// InstallStateInstalled is the state where the plugin is installed and
	// ready for interaction.
	InstallStateInstalled
)

// Plugin stores information about an installed plugin.
type Plugin struct {
	state InstallState
	name  string

	dir    string
	client *plugin.Client
	remote UIPluginServiceClient

	httpHost string
}

// ListPlugins lists all plugins inside a directory.
func ListPlugins(pluginDir string) ([]*Info, error) {
	files, err := ioutil.ReadDir(pluginDir)
	if err != nil {
		return nil, err
	}

	infos := make([]*Info, 0, len(files))
outside:
	for _, file := range files {
		// plugins must be a zip file (and not named ".zip")
		// (not going to use `EqualFold` to avoid attack surface involving unicode)
		fileName := file.Name()
		if file.IsDir() || len(fileName) <= 4 || !strings.HasSuffix(fileName, ".zip") {
			continue
		}

		info := &Info{Name: fileName[:len(fileName)-4]}
		path := filepath.Join(pluginDir, fileName)
		logger := log.With(zap.String("path", path))

		// open the zip file to read its content (ignore corrupted files)
		zipFile, err := zip.OpenReader(path)
		if err != nil {
			logger.Debug("[plugin] skipping non-zip file", zap.Error(err))
			continue
		}
		defer zipFile.Close()

		hasManifest := false
		hasPluginExe := false
		for _, content := range zipFile.File {
			// only read the manifest and icon (and also checks if plugin.exe really exists)
			switch content.Name {
			case "manifest.toml", "icon.png", "icon.svg":
			case pluginFileName:
				hasPluginExe = true
				continue
			default:
				continue
			}

			logger2 := logger.With(zap.String("name", content.Name))

			// read the content into memory...
			reader, err := content.Open()
			if err != nil {
				logger2.Debug("[plugin] cannot open zip content", zap.Error(err))
				continue outside
			}
			defer reader.Close()

			bytes, err := ioutil.ReadAll(reader)
			if err != nil {
				logger2.Debug("[plugin] cannot read zip content", zap.Error(err))
				continue outside
			}

			// then assign into the info.
			switch content.Name {
			case "manifest.toml":
				if err = toml.Unmarshal(bytes, &info.Manifest); err != nil {
					logger2.Debug("[plugin] invalid manifest", zap.Error(err))
					continue outside
				}
				hasManifest = true
			case "icon.png":
				info.Icon.Body = bytes
				info.Icon.ContentType = "image/png"
			case "icon.svg":
				info.Icon.Body = bytes
				info.Icon.ContentType = "image/svg+xml"
			}
		}

		// skip if either manifest.toml or plugin.exe is missing.
		if !hasManifest {
			logger.Debug("[plugin] zip file has no manifest.toml")
			continue
		}
		if !hasPluginExe {
			logger.Debug("[plugin] zip file has no plugin.exe", zap.String("name", pluginFileName))
			continue
		}

		// we are now pretty sure it is a plugin, add it to the list.
		infos = append(infos, info)
	}

	return infos, nil
}

// State obtains the plugin state.
func (p *Plugin) State() InstallState {
	// needs atomic because we may access the plugin state from multiple APIs
	return InstallState(atomic.LoadUint32((*uint32)(&p.state)))
}

func (p *Plugin) setState(state InstallState) {
	atomic.StoreUint32((*uint32)(&p.state), uint32(state))
}

// Install initializes the plugin at the given path.
func (p *Plugin) Install(ctx context.Context, cfg *config.Config, pluginName string) error {
	p.name = pluginName
	if err := p.unzip(cfg, pluginName); err != nil {
		return err
	}
	if err := p.execute(); err != nil {
		return err
	}
	if err := p.handshake(ctx, cfg); err != nil {
		return err
	}
	return nil
}

// unzip the content of the plugin into a temporary directory.
func (p *Plugin) unzip(cfg *config.Config, pluginName string) error {
	pluginPath := filepath.Join(cfg.PluginDir, pluginName+".zip")

	tempDir, err := ioutil.TempDir("", "dashboard-plugin-*")
	if err != nil {
		return err
	}
	defer func() {
		if len(tempDir) != 0 {
			os.RemoveAll(tempDir)
		}
	}()

	logger := log.With(zap.String("path", pluginPath), zap.String("tempDir", tempDir))

	zipFile, err := zip.OpenReader(pluginPath)
	if err != nil {
		logger.Error("[plugin] plugin is not a zip file", zap.Error(err))
		return err
	}
	defer zipFile.Close()

	for _, content := range zipFile.File {
		if content.Name == pluginFileName {
			srcFile, err := content.Open()
			if err != nil {
				logger.Error("[plugin] cannot open plugin exe for extraction", zap.Error(err))
				return err
			}
			defer srcFile.Close()

			targetFile, err := os.OpenFile(filepath.Join(tempDir, pluginFileName), os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0744)
			if err != nil {
				logger.Error("[plugin] cannot initialize plugin exe", zap.Error(err))
				return err
			}
			defer targetFile.Close()

			if _, err = io.Copy(targetFile, srcFile); err != nil {
				logger.Error("[plugin] cannot extract plugin exe", zap.Error(err))
			}
		}
	}

	p.dir = tempDir
	p.setState(InstallStateDecompressed)
	tempDir = ""
	return nil
}

// execute the plugin located at `path`.
func (p *Plugin) execute() error {
	path := filepath.Join(p.dir, pluginFileName)
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig:  handshakeConfig,
		Logger:           utils.AsHCLog(log.L(), "plugin/"+p.name),
		Cmd:              exec.Command(path),
		AllowedProtocols: []plugin.Protocol{plugin.ProtocolGRPC},
		Plugins: plugin.PluginSet{
			"ui": &uiPlugin{},
		},
	})
	defer func() {
		if client != nil {
			client.Kill()
		}
	}()

	rpcClient, err := client.Client()
	if err != nil {
		return err
	}

	raw, err := rpcClient.Dispense("ui")
	if err != nil {
		return err
	}

	p.client = client
	p.remote = raw.(UIPluginServiceClient)
	p.setState(InstallStateExecuted)
	client = nil
	return nil
}

// handshake performs the initialization routine to exchange information between
// the host and the plugin.
func (p *Plugin) handshake(ctx context.Context, cfg *config.Config) error {
	resp, err := p.remote.InitializeUIPlugin(ctx, &InstallRequest{
		PdEndpoint:      cfg.PDEndPoint,
		EnableTelemetry: cfg.EnableTelemetry,
		ClusterTls: &TLSInfo{
			Ca:   cfg.ClusterTLSInfo.TrustedCAFile,
			Cert: cfg.ClusterTLSInfo.CertFile,
			Key:  cfg.ClusterTLSInfo.KeyFile,
		},
		TidbTls: &TLSInfo{
			Ca:   cfg.TiDBTLSInfo.TrustedCAFile,
			Cert: cfg.TiDBTLSInfo.CertFile,
			Key:  cfg.TiDBTLSInfo.KeyFile,
		},
	})
	if err != nil {
		return err
	}
	p.httpHost = resp.HttpHost
	p.setState(InstallStateInstalled)
	return nil
}

// Uninstall the plugin.
func (p *Plugin) Uninstall() {
	p.setState(InstallStateUninstalled)
	if p.client != nil {
		p.client.Kill()
	}
	if len(p.dir) != 0 {
		os.RemoveAll(p.dir)
	}
}

// ForwardHTTP forwards an HTTP request to the plugin.
func (p *Plugin) ForwardHTTP(req *http.Request) (*http.Response, error) {
	req.URL.Scheme = "http"
	req.URL.Host = p.httpHost
	req.Host = ""
	req.RequestURI = ""
	return http.DefaultClient.Do(req)
}
