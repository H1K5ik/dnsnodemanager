const fs = require("fs");

module.exports = class BindForwarderFile {

  info = null;
  filename = '';

  constructor(info) {
    this.info = info;
    this.filename = `${info.name}.conf`;
  }

  buildForwarderFile() {
    const forwarders_array = this.info.members.split(',').map(ip => ip.trim());
    const forwarders_string = forwarders_array.join(';\n    ');
    
    return `# Forwarder group: ${this.info.name}
# Generated automatically - do not edit manually
forwarders {
    ${forwarders_string};
};
`;
  }

  writeTo(path) {
    return fs.writeFileSync(path, this.buildForwarderFile());
  }

}
