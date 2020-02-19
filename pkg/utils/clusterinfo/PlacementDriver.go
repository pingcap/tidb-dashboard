package clusterinfo

type PD struct {
	DeployCommon
	Version string `json:"version"`
	// It will query PD's health interface.
	ServerStatus string `json:"server_status"`
}
