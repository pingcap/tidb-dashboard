# Manual test environments

These Vagrant environments are development tools, not production deployment
configuration. Run commands from the individual environment directory.

## SSH keys

The host needs `ssh-keygen`. Loading an environment's Vagrantfile generates an
Ed25519 key pair at `.vagrant/tiup_ssh_key` if it does not already exist. The
private key is unencrypted for use by the test tooling, has owner-only
permissions, and is ignored by Git. Each environment has its own key; repeated
runs reuse it. TiUP deployment uses `-i .vagrant/tiup_ssh_key`.

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

Use the environment-specific key path in future TiUP deployment commands. Keep
`.vagrant/tiup_ssh_key` while using the environment; deleting it generates a new
identity on the next Vagrant command, and existing guests must be reprovisioned
to authorize that identity. Do not copy the legacy private key into the new path.

Destroy disposable environments using their individual cleanup instructions.
Treat the legacy private key as permanently public even though it has been
removed from the current tree.
