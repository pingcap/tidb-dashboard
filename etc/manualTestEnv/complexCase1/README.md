# complexCase1

TiDB, PD, TiKV, TiFlash each in different hosts.

## Usage

1. Start the box:

   ```bash
   VAGRANT_EXPERIMENTAL="disks" vagrant up
   ```

1. Use [TiUP](https://tiup.io/) to deploy the cluster to the box (only need to do it once):

   ```bash
   tiup cluster deploy complexCase1 v4.0.8 topology.yaml -i ../_shared/vagrant_key -y --user vagrant
   ```

1. Start the cluster in the box:

   ```bash
   tiup cluster start complexCase1
   ```

1. Start TiDB Dashboard server:

   ```bash
   bin/tidb-dashboard --pd http://10.0.1.31:2379
   ```

## Cleanup

```bash
tiup cluster destroy complexCase1 -y
vagrant destroy --force
```
