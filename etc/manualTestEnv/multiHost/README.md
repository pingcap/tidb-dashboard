# multiHost

TiDB, PD, TiKV, TiFlash each in different hosts.

## Usage

1. Start the box (requires `ssh-keygen` on the host):

   ```bash
   vagrant up
   ```

   The first run generates a private SSH key at
   `../.ssh-keys/multiHost/tiup_ssh_key`, outside the guest shared folder and
   ignored by Git. Later runs reuse it. See the
   [shared instructions](../README.md) for upgrading existing VMs.

1. Use [TiUP](https://tiup.io/) to deploy the cluster to the box (only need to do it once):

   ```bash
   tiup cluster deploy multiHost v4.0.8 topology.yaml -i ../.ssh-keys/multiHost/tiup_ssh_key -y --user vagrant
   ```

1. Start the cluster in the box:

   ```bash
   tiup cluster start multiHost
   ```

1. Start TiDB Dashboard server:

   ```bash
   bin/tidb-dashboard --pd http://10.0.1.11:2379
   ```

## Cleanup

```bash
tiup cluster destroy multiHost -y
vagrant destroy --force
```
