# Manual test environments

These Vagrant environments are development tools, not production deployment
configuration. Run commands from the individual environment directory.

## SSH keys

The host needs `ssh-keygen`. Loading an environment's Vagrantfile generates an
Ed25519 key pair at `../.ssh-keys/<environment>/tiup_ssh_key` if it does not
already exist, where `<environment>` is the environment directory name. This
host-only location is outside all five environments' default `/vagrant` shared
folders. The private key is unencrypted for use by the test tooling, has
owner-only permissions, and is ignored by Git. Each environment has its own key;
repeated runs reuse it. For example, from `singleHost`, TiUP deployment uses
`-i ../.ssh-keys/singleHost/tiup_ssh_key`. Existing shared folders and deployment
paths under `/vagrant` remain available.

Only the public key is installed in the guests. Provisioning preserves other
authorized keys, removes the legacy repository key, and avoids duplicate entries
for the new key. `_shared/vagrant_key.pub` is retained solely to identify the
legacy authorization to remove; its private key must not be used again.

## Existing environments

Updating the repository alone does not revoke the old key on running VMs. From
each existing environment directory, run:

```bash
vagrant provision --provision-with private_key
```

This uses Vagrant's own SSH connection to install the environment-specific public
key and remove the legacy key, without rerunning the disk or cluster provisioning
steps. Other authorized keys, including TiUP's cluster-management key, remain in
place. Ensure every VM is running when applying this migration. For VMs outside
these templates that reused the old key, remove its authorization separately.

If an earlier version of these templates generated `.vagrant/tiup_ssh_key`, the
same provisioning command also revokes that key and authorizes a fresh key at the
host-only location. After every VM has been reprovisioned, delete the old
`.vagrant/tiup_ssh_key` and `.vagrant/tiup_ssh_key.pub` files. Keep Vagrant's other
state files and its own SSH identities in place.

Use the environment-specific key path in future TiUP deployment commands. Keep
`../.ssh-keys/<environment>/tiup_ssh_key` while using the environment; deleting it
generates a new identity on the next Vagrant command, and existing guests must
be reprovisioned to authorize that identity. Do not copy an exposed private key
into the new path.

Before replacing a host-only key, retain its public key and remove that identity
from every guest's `authorized_keys`, including entries with authorization
options. Reprovisioning adds the replacement key but cannot identify a deleted
host-only key to revoke. Vagrant's own SSH connection remains available for this
cleanup.

Destroy disposable environments using their individual cleanup instructions.
Treat the legacy private key as permanently public even though it has been
removed from the current tree.
