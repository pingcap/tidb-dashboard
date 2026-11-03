# complexCase1

TiDB, PD, TiKV, TiFlash each in different hosts.

## Usage

1. Start the box (requires `ssh-keygen` on the host):

   ```bash
   VAGRANT_EXPERIMENTAL="disks" vagrant up
   ```

   The first run generates a private SSH key at `.vagrant/tiup_ssh_key`, unique to
   this environment and ignored by Git. Later runs reuse it. See the
   [shared instructions](../README.md) for upgrading existing VMs.

1. Use [TiUP](https://tiup.io/) to deploy the cluster to the box (only need to do it once):

   ```bash
   tiup cluster deploy complexCase1 v4.0.8 topology.yaml -i .vagrant/tiup_ssh_key -y --user vagrant
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
