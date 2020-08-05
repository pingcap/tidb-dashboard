package main

import (
	"fmt"
	"net/http"

	dh "github.com/pingcap-incubator/tidb-dashboard/pkg/http"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/plugin"
)

func main() {
	plugin.RunUIPlugin(HelloUIPlugin{})
}

type HelloUIPlugin struct{}

func (p HelloUIPlugin) InstallUI(registry *plugin.UIRegistry) error {
	httpClient := dh.NewHTTPClientWithConf(registry, registry.CoreConfig)
	pdClient := pd.NewPDClient(registry, httpClient, registry.CoreConfig)

	registry.ServeMux().HandleFunc("/pd-version", func(w http.ResponseWriter, _ *http.Request) {
		versionBytes, err := pdClient.SendGetRequest("/version")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintln(w, err)
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write(versionBytes)
		}
	})

	return nil
}
