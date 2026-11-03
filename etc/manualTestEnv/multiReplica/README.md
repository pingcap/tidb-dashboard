# multiReplica

Multiple TiKV nodes in different labels.

## Usage

1. Start the box (requires `ssh-keygen` on the host):

   ```bash
   vagrant up
   ```

   The first run generates a private SSH key at `.vagrant/tiup_ssh_key`, unique to
   this environment and ignored by Git. Later runs reuse it. See the
   [shared instructions](../README.md) for upgrading existing VMs.

1. Use [TiUP](https://tiup.io/) to deploy the cluster to the box (only need to do it once):

   ```bash
   tiup cluster deploy multiReplica v4.0.8 topology.yaml -i .vagrant/tiup_ssh_key -y --user vagrant
   ```

1. Start the cluster in the box:

   ```bash
   tiup cluster start multiReplica
   ```

1. Start TiDB Dashboard server:

   ```bash
   bin/tidb-dashboard --pd http://10.0.1.20:2379
   ```

## Cleanup

```bash
tiup cluster destroy multiReplica -y
vagrant destroy --force
```
