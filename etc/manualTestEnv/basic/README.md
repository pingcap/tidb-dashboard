# basic

An environment with TiDB, PD, TiKV, TiFlash.

## Usage

1. Start the box and cluster:

   ```bash
   vagrant up
   vagrant ssh
   tiup playground nightly --monitor --host 10.0.1.2
   ```

2. Outside the box, start TiDB Dashboard server:

   ```bash
   bin/tidb-dashboard --pd http://10.0.1.2:2379
   ```
