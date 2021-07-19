// +build !distro

package distro

var Resource = map[interface{}]interface{}{
	"tidb":    "TiDB",
	"tikv":    "TiKV",
	"tiflash": "TiFlash",
	"pd":      "PD",
}
