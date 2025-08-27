const fs = require('fs');
const ip = require('ip');
const path = require('path');

module.exports = {

  validateKeys(keys, data) {
    for(let i = 0; i < keys.length; i++) {
      if( ! (keys[i] in data) ) return false;
    }
    return true;
  },

  validateServerName(name) {
    return name.length >= 2 && name.length <= 100;
  },

  validateIP(ip) {
    const regEx = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regEx.test(ip);
  },

  validateIP6(ip) {
    const regEx = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return regEx.test(ip);
  },

  validateIP4ReverseNetwork(network) {
    const regEx = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(8|16|24)$/;
    return regEx.test(network);
  },

  validateFQDN(fqdn) {
    const regEx = /^([a-zA-Z0-9._-])+$/;
    return regEx.test(fqdn);
  },

  validateDnsName(name) {
    return ( /^[a-z0-9-_\.*]{1,63}$/.test(name) || name === '@' );
  },

  validateNsGroupName(name) {
    return ( name.length >= 2 && name.length <= 100 );
  },

  validateFwdMembers(list) {
    let ips = list.split(',');
    for( let i = 0; i < ips.length; i++ ) {
      if( ! this.validateIP(ips[i].trim()) ) return false;
    }
    return true;
  },

  validateView(name) {
    return ( name.length >= 2 && name.length <= 50 );
  },

  validateZoneComment(comment) {
    return ( comment === null || comment.length < 250 );
  },

  validateRecordType(type) {
    const rrFile = fs.readFileSync(path.join(__dirname, 'RRTypes.json'));
    return JSON.parse(rrFile).hasOwnProperty(type.toLowerCase());
  },

  validateRecordSanity(type, name, data) {
    switch(type) {
      case "mx":
        if( ! /^[0-9]{1,2}\s.{5,}$/.test(data) ) throw Error("invalid mx record. make sure u have priority in it.");
        break;
      case "txt":
      case "srv":
      case "ns":
      case "custom":
        // not much to check here?!
        break;
      case "cname":
        if( ! this.validateFQDN(data.replace(/\.$/, '')) ) throw Error("invalid target FQDN"); // make sure to remove trailing dot before checking fqdn
        break;
      case "aaaa":
        if( ! this.validateIP6(data) ) throw Error("invalid ip6 address");
        break;
      case "a":
        if( ! this.validateIP(data) ) throw Error("invalid ip address");
        break;
      case "ptr":
        if( parseInt(name) < 0 || parseInt(name) > 255 ) throw Error("invalid ip address for reverse record");
        if( ! this.validateFQDN(data.replace(/\.$/, '')) ) throw Error("invalid target FQDN"); // make sure to remove trailing dot before checking fqdn
        break;
      default:
        throw Error("invalid record type");
    }
  },

  validateTTL(ttl) {
    return ( ttl > 0 && ttl <= 86400 );
  },

  validateSoaValue(value) {
    return ( value > 0 && value <= 2147483647 );
  },

  validateRname(value) {
    // ToDo: find regex to check rname
    return true;
  },

  validateUsername(name) {
    return name.trim().length > 2 && name.trim().length <= 50;
  },

  validatePassword(password) {
    // ToDo: password complexity options?
    return password.length >= 8;
  },

  validateUserRole(role) {
    // ToDo: share this dataset between client/server
    return ['ro','dnsop','dnsadmin','sysadmin'].includes(role);
  },

  validateFileUpload(files, name) {
    return files !== null && files.hasOwnProperty(name) && files[name].size > 1;
  },

  convertIP4netToFQDN(network) {
    let result = "in-addr.arpa";
    const subnet = ip.cidrSubnet(network);
    const parts  = ip.toBuffer(subnet.networkAddress);
    for( let i = 0; i < subnet.subnetMaskLength; i += 8 ) result = String(parts[i/8]) + "." + result;
    return result;
  },

  convertFqdnToIP4net(fqdn) {
    const reverse = fqdn.replace('.in-addr.arpa', '');
    const octets  = reverse.split('.').reverse();
    let networkString = octets[0];
    for( let i = 1; i < 4; i++ ) {
      networkString += octets[i] ? `.${octets[i]}` : `.0`;
    }
    return networkString + ` / ${octets.length*8}`;
  }

}
