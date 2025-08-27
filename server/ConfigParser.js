const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

module.exports = {
  async init() {
    this.logging = yaml.parse(fs.readFileSync('config/logging.yml', 'utf8'));
    this.auth = yaml.parse(fs.readFileSync('config/auth.yml', 'utf8'));
    this.web = yaml.parse(fs.readFileSync('config/web.yml', 'utf8'));
  }
}
