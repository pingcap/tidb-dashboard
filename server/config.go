package server

type Config struct {
	// Server listening address.
	Addr string

	// Etcd endpoints
	EtcdAddrs []string

	RootPath string

	// LeaderLease time, if leader doesn't update its TTL
	// in etcd after lease time, etcd will expire the leader key
	// and other servers can campaign the leader again.
	// Etcd onlys support seoncds TTL, so here is second too.
	LeaderLease int64
}
