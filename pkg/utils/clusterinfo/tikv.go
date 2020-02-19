package clusterinfo

type TiKV struct {
	// This field is copied from tidb.
	ServerVersionInfo
	ServerStatus  string `json:"server_status"`
	IP            string
	Port          string
	BinaryPath    string `json:"binary_path"`
	StatusAddress string `json:"status_port"`
}
