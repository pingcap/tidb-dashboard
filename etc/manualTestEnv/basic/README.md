# basic

An environment with TiDB, PD, TiKV, TiFlash.

## Usage

Start the box and cluster:

```ssh
vagrant up
vagrant ssh
tiup playground nightly --monitor --host 10.0.1.2
```

Connect the cluster in the box:

```ssh
bin/tidb-dashboard --pd http://10.0.1.2:2379
```
