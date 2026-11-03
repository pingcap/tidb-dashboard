require "fileutils"
require "open3"
require "shellwords"

def configure_dashboard_test_environment(environment_dir)
  # Keep host credentials outside every environment's default /vagrant share.
  key_path = File.expand_path(File.join(environment_dir, "..", ".ssh-keys",
                                       File.basename(environment_dir), "tiup_ssh_key"))
  unless File.exist?(key_path)
    FileUtils.mkdir_p(File.dirname(key_path), mode: 0o700)
    generated = system("ssh-keygen", "-q", "-t", "ed25519", "-N", "",
                       "-C", "tidb-dashboard-manual-test", "-f", key_path)
    raise "Failed to generate test SSH key: #{key_path}" unless generated
  end

  ssh_pub_key, status = Open3.capture2("ssh-keygen", "-y", "-P", "", "-f", key_path)
  raise "Failed to read test SSH key: #{key_path}" unless status.success?

  # Keep only the old public key so provisioning can revoke its authorization.
  legacy_key = File.read(File.join(__dir__, "vagrant_key.pub")).split[1]
  ssh_pub_key = ssh_pub_key.strip
  previous_key = ""
  previous_key_path = File.join(environment_dir, ".vagrant", "tiup_ssh_key")
  if File.exist?(previous_key_path)
    previous_pub_key, status = Open3.capture2("ssh-keygen", "-y", "-P", "", "-f", previous_key_path)
    raise "Failed to read previous test SSH key: #{previous_key_path}" unless status.success?
    previous_key = previous_pub_key.split[1]
  end

  Vagrant.configure("2") do |config|
    config.vm.box = "hashicorp/bionic64"
    config.vm.provision "zsh", type: "shell", privileged: false, inline: <<-SHELL
      echo "Installing zsh"
      sudo apt install -y zsh
      sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
      sudo chsh -s /usr/bin/zsh vagrant
    SHELL

    config.vm.provision "private_key", type: "shell", privileged: false, inline: <<-SHELL
      set -eu
      echo "Installing environment-specific SSH public key and revoking the legacy key"
      mkdir -p "$HOME/.ssh"
      chmod 700 "$HOME/.ssh"
      authorized_keys="$HOME/.ssh/authorized_keys"
      touch "$authorized_keys"
      authorized_keys_tmp=$(mktemp "$HOME/.ssh/authorized_keys.XXXXXX")
      trap 'rm -f "$authorized_keys_tmp"' EXIT
      awk -v legacy=#{legacy_key.shellescape} -v current=#{ssh_pub_key.split[1].shellescape} \\
        -v previous=#{previous_key.shellescape} \\
        '$2 != legacy && $2 != current && (previous == "" || $2 != previous)' "$authorized_keys" > "$authorized_keys_tmp"
      printf '%s\\n' #{ssh_pub_key.shellescape} >> "$authorized_keys_tmp"
      chmod 600 "$authorized_keys_tmp"
      mv "$authorized_keys_tmp" "$authorized_keys"
    SHELL

    config.vm.provision "ulimit", type: "shell", privileged: true, inline: <<-SHELL
      echo "Setting ulimit"
      echo "fs.file-max = 65535" >> /etc/sysctl.conf
      sysctl -p
      echo "*      hard    nofile   65535" >> /etc/security/limits.conf
      echo "*      soft    nofile   65535" >> /etc/security/limits.conf
      echo "root   hard    nofile   65535" >> /etc/security/limits.conf
      echo "root   hard    nofile   65535" >> /etc/security/limits.conf
    SHELL
  end
end
