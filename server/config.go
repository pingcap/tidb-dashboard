package server

type Config struct {
	// Server listening address.
	Addr string

	// Etcd endpoints
	EtcdAddrs []string

	RootPath string
}
