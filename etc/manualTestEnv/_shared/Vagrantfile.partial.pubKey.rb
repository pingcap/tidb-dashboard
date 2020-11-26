Vagrant.configure("2") do |config|
  ssh_pub_key = File.readlines("#{File.dirname(__FILE__)}/vagrant_key.pub").first.strip

  config.vm.box = "hashicorp/bionic64"
  config.vm.provision "zsh", type: "shell", privileged: false, inline: <<-SHELL
    echo "Installing zsh"
    sudo apt install -y zsh
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
    sudo chsh -s /usr/bin/zsh vagrant
  SHELL

  config.vm.provision "private_key", type: "shell", privileged: false, inline: <<-SHELL
    echo "Inserting private key"
    echo #{ssh_pub_key} >> /home/vagrant/.ssh/authorized_keys
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
