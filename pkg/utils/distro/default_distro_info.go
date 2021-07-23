// +build !dashboard_distro

package distro

var Resource = map[string]string{
	"tidb":    "TiDB",
	"tikv":    "TiKV",
	"tiflash": "TiFlash",
	"pd":      "PD",
}
