package plugin

import (
	"context"
	"log"
	"net/http"

	"github.com/hashicorp/go-plugin"
	"go.uber.org/fx"
	"google.golang.org/grpc"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

// GRPCServer implements plugin.GRPCPlugin.
func (p *uiPlugin) GRPCServer(_ *plugin.GRPCBroker, s *grpc.Server) error {
	RegisterUIPluginServiceServer(s, p)
	return nil
}

// GRPCClient implements plugin.GRPCClient.
func (*uiPlugin) GRPCClient(_ context.Context, _ *plugin.GRPCBroker, c *grpc.ClientConn) (interface{}, error) {
	return NewUIPluginServiceClient(c), nil
}

type UI interface {
	InstallUI(registry *UIRegistry) error
}

type UIRegistry struct {
	CoreConfig *config.Config
	serveMux   *http.ServeMux
	hooks      []fx.Hook
}

// ServeMux returns the HTTP request multiplexer used to receive requests from
// the host.
func (reg *UIRegistry) ServeMux() *http.ServeMux {
	return reg.serveMux
}

// Append implements fx.Lifecycle
func (reg *UIRegistry) Append(hook fx.Hook) {
	reg.hooks = append(reg.hooks, hook)
}

// RunUIPlugin starts the plugin in the current thread. This will create a
// server for the Dashboard Host process to connect. This method only returns
// after the plugin is killed by the host.
func RunUIPlugin(impl UI) {
	lifecycleCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	p := &uiPlugin{
		impl:         impl,
		lifecycleCtx: lifecycleCtx,
	}
	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: handshakeConfig,
		GRPCServer:      plugin.DefaultGRPCServer,
		Plugins:         plugin.PluginSet{"ui": p},
	})

	for i := len(p.destructors) - 1; i >= 0; i-- {
		if err := p.destructors[i](lifecycleCtx); err != nil {
			log.Println("plugin stop hook failed:", err)
		}
	}
}
