package info

// ServerVersionInfo is the server version and git_hash.
type ServerVersionInfo struct {
	Version string `json:"version"`
	GitHash string `json:"git_hash"`
}

type Common struct {
	DeployCommon
	ServerStatus string
	// This field is copied from tidb.
	ServerVersionInfo
}

type DeployCommon struct {
	IP         string
	Port       uint64
	BinaryPath string
}
