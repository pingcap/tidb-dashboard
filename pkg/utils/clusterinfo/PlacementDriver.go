package clusterinfo

type PD struct {
	ClientUrls []string `json:"client_urls"`
	BinaryPath string   `json:"binary_path"`
	Version    string   `json:"version"`
	// It will query PD's health interface.
	ServerStatus string `json:"server_status"`
}
