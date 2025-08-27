module.exports = class BindConfig {

  config_path = "";
  zones = [];

  constructor(path) {
    this.config_path = path;
  }

  addZone(zone) {
    this.zones.push(zone);
  }

  getMasters(zone) {
    const masters = zone.source_id === null ? zone.ns_group_set.filter(server => { return Boolean(server.primary); }) : zone.ns_group_set.filter(server => (zone.source_id === server.server_id));
    return masters.map(server => (server.dns_ip));
  }

  getSlaves(zone) {
    const slaves = zone.ns_group_set.filter(server => { return !Boolean(server.primary); });
    return slaves.map(server => (server.dns_ip));
  }

  getAlternativeSlaves(zone) {
    const slaves = zone.ns_group_set.filter(server => server.source_id === zone.serverID);
    return slaves.map(server => (server.dns_ip));
  }

  generateZone(zone) {
    try {
      if( zone.type === 'forward' ) return this.generateForwardZone(zone);
      if( zone.primary ) return this.generateMasterZone(zone);
      if( zone.type === 'stub' ) return this.generateStubZone(zone);
      return this.generateSlaveZone(zone);
    } catch(e) {
      console.log(e);
      throw Error('Fatal: Failed to create config for ' + zone.fqdn);
    }
  }

  generateForwardZone(zone) {
    const forwarders_array = zone.forwarders.split(',');
    const forwarders_string = forwarders_array.join("; ");
    return `
      zone "${zone.fqdn}" {
        type forward;
        forwarders { ${forwarders_string}; };
        forward only;
      };`;
  }

  generateMasterZone(zone) {
    const slaves = this.getSlaves(zone).join('; ');
    const updaters = zone.dynamicUpdaters.join('; ');
    return `
      zone "${zone.fqdn}" {
        type master;
        allow-transfer { ${slaves}; };
        also-notify { ${slaves}; };${ updaters.length ? `
        allow-update { ${updaters}; };` : '' }
        file "${this.config_path}/${zone.fqdn}.${zone.view.name}.db";
        ${zone.config || ''}
      };`;
  }

  generateSlaveZone(zone) {
    const masters = this.getMasters(zone);
    const slaves = this.getAlternativeSlaves(zone);
    return `
      zone "${zone.fqdn}" {
        type slave;
        masters { ${masters[0]}; }; ${ slaves.length ? `
        allow-transfer { ${slaves.join('; ')}; };
        also-notify { ${slaves.join('; ')}; };` : '' }
        file "${zone.fqdn}.${zone.view.name}.db";
        ${zone.config || ''}
      };`;
  }

  generateStubZone(zone) {
    const masters = this.getMasters(zone);
    return `
      zone "${zone.fqdn}" {
        type stub;
        masters { ${masters} };
        file "${zone.fqdn}.${zone.view.name}.db";
        ${zone.config || ''}
      };`;
  }

  buildConfigFile() {
    let i, j, zones, tmp,
    string = "### WARNING ###\n# This file is managed by a 3rd party application.\n# Any changes you make will be discarded on next configuration sync.\n\n";
    // Consolidate views
    const views = [...new Set(this.zones.map(zone => { return zone.view; }))];
    for( i = 0; i < views.length; i++ ) {
      zones = this.zones.filter( zone => { return zone.view.name === views[i].name; } );
      tmp = '';
      // Zone configs
      for( j = 0; j < zones.length; j++ ) {
        tmp += this.generateZone(zones[j]);
      }
      // Wrap into view statement if we have multiple views
      string += views.length < 2 ? tmp : `
  view ${views[i].name} {
    ${views[i].config}
    ${tmp}
  };
  `;
    }
    return string + "\n";
  }

}
