package clusterinfo

// ServerVersionInfo is the server version and git_hash.
type ServerVersionInfo struct {
	Version string `json:"version"`
	GitHash string `json:"git_hash"`
}

type Common struct {
	DeployCommon
	// This field is copied from tidb.
	ServerVersionInfo
	ServerStatus string `json:"server_status"`
}

type DeployCommon struct {
	IP         string
	Port       string
	BinaryPath string `json:"binary_path"`
}
