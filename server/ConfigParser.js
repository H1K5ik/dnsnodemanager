const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

module.exports = {
  async init() {
    const configDir = path.join(__dirname, 'config');
    this.logging = yaml.parse(fs.readFileSync(path.join(configDir, 'logging.yml'), 'utf8'));
    this.auth = yaml.parse(fs.readFileSync(path.join(configDir, 'auth.yml'), 'utf8'));
    this.web = yaml.parse(fs.readFileSync(path.join(configDir, 'web.yml'), 'utf8'));
  }
}
