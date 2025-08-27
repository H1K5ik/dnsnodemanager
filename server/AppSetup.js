const fs = require('fs');
const os = require('os');
const path = require('path');

const datadir = 'data';
const prifile = 'data/id_rsa';
const pubfile = 'data/id_rsa.pub';

module.exports = {

  async init() {
    // Ensure data dir exists
    fs.existsSync(datadir) || fs.mkdirSync(datadir);
    // Keypair
    if( ! fs.existsSync(pubfile) || ! fs.existsSync(prifile) ) {
      await this.createNewKeypair();
    } else {
      console.log("Using existing OpenSSH keypair in ./data/");
    }
  },

  async createNewKeypair() {
    try {
      console.log("No OpenSSH keypair found. Creating new pair...");
      const keypair = require('keypair');
      const forge = require('node-forge');
      const pair = keypair();
      const publicKey = forge.pki.publicKeyFromPem(pair.public);
      const privateKey = forge.pki.privateKeyFromPem(pair.private);
      const ssh_public = forge.ssh.publicKeyToOpenSSH(publicKey, 'dnsnodemanager@' + os.hostname());
      const ssh_private = forge.ssh.privateKeyToOpenSSH(privateKey);
      fs.writeFileSync(pubfile, ssh_public, {mode: 0o600}) && console.log("Public Key saved to: data/id_rsa.pub");
      fs.writeFileSync(prifile, ssh_private, {mode: 0o600}) && console.log("Private Key saved to: data/id_rsa");
      console.log("OpenSSH keypair generation successful.");
    } catch(err) {
      console.error(err);
      process.exit();
    }
  }

}
