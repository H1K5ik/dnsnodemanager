const fs = require("fs");

module.exports = class BindZoneFile {

  info = null;
  records = [];
  filename = '';

  constructor(info, records) {
    this.info = info;
    this.records = records;
    this.filename = `${info.fqdn}.${info.view.name}.db`;
  }

  buildZoneFile() {
    const zone = this.info;
    const ttl  = zone.ttl || zone.view.ttl;
    const zoneOrigin = zone.fqdn + '.';
    // Header, SOA, NS Records
    let string = "$ORIGIN " + zoneOrigin + "\n$TTL " + ttl + "\n" + this.buildSoaRecord() + "\n";
    // NS Records
    for( let i = 0; i < this.info.nameservers.length; i++ ) {
      string += this.buildRecord('@', 'NS', this.info.nameservers[i].dns_fqdn + '.');
    }
    // Glue A records for in-bailiwick NS (required by named-checkzone)
    for( let i = 0; i < this.info.nameservers.length; i++ ) {
      const ns = this.info.nameservers[i];
      if( !ns.dns_ip ) continue;
      const nsFqdn = ns.dns_fqdn.endsWith('.') ? ns.dns_fqdn : ns.dns_fqdn + '.';
      const inZone = nsFqdn === zoneOrigin || nsFqdn.endsWith('.' + zoneOrigin);
      if( inZone ) {
        const relName = nsFqdn === zoneOrigin ? '@' : nsFqdn.slice(0, nsFqdn.length - zoneOrigin.length).replace(/\.$/, '') || '@';
        string += this.buildRecord(relName, 'A', ns.dns_ip);
      }
    }
    // Regular Records
    for( let j = 0; j < this.records.length; j++ ) {
      string += this.buildRecord(this.records[j].name, this.records[j].type.toUpperCase(), this.records[j].data);
    }
    return string;
  }

  buildSoaRecord() {
    const zone = this.info;
    const primary = zone.nameservers.find(ns => ns.primary);
    const rname   = zone.soa_rname || zone.view.soa_rname;
    const refresh = zone.soa_refresh || zone.view.soa_refresh;
    const retry   = zone.soa_retry || zone.view.soa_retry;
    const expire  = zone.soa_expire || zone.view.soa_expire;
    const ttl    = zone.soa_ttl || zone.view.soa_ttl;
    return `${'@'.padEnd(20)} SOA ${primary.dns_fqdn}. ${rname} (
                          ${zone.soa_serial.toString().padEnd(20)} ; zone serial
                          ${refresh.toString().padEnd(20)} ; refresh
                          ${retry.toString().padEnd(20)} ; retry
                          ${expire.toString().padEnd(20)} ; expire
                          ${ttl.toString().padEnd(20)} ) ; negative caching ttl`;
  }

  buildRecord(name, type, data) {
    if( type === 'CUSTOM' ) {
      return data + "\n";
    } else {
      return name.padEnd(20) + ' ' + type.padEnd(4) + ' ' + data + "\n";
    }
  }

  writeTo(path) {
    return fs.writeFileSync(path, this.buildZoneFile());
  }

}
