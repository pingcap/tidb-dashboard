package clusterinfo

type TiDB struct {
	Common
	StatusPort string `json:"status_port"`
}
