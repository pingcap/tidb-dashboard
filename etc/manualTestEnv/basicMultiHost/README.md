# basicMultiHost

An environment with TiDB, PD, TiKV, TiFlash, each in different host.

## Usage

1. Generate shared SSH key (only need to do it once):

   ```bash
   ssh-keygen -t rsa -b 2048 -f ./shared_key -q -N ""
   ```

1. Start the box:

   ```bash
   vagrant up
   ```

1. Use [TiUP](https://tiup.io/) to deploy the cluster to the box (only need to do it once):

   ```bash
   tiup cluster deploy multiHost nightly topology.yaml -i shared_key -y --user vagrant
   ```

1. Start the cluster in the box:

   ```bash
   tiup cluster start multiHost
   ```

1. Start TiDB Dashboard server:

   ```bash
   bin/tidb-dashboard --pd http://10.0.1.11:2379
   ```
