const fs = require('fs');

module.exports = class BindParser {

  parsed  = false;
  content = null;
  records = [];
  soa     = {values: []};

  setContentFromFile( path ) {
    this.content = fs.readFileSync(path).toString();
    this.stripComments();
  }

  setContent( content ) {
    this.content = content;
    this.stripComments();
  }

  stripComments() {
    this.content = this.content.replace(/;.*$/g, '');
  }

  getSoa() {
    this.parsed || this.parseFile();
    return this.soa;
  }

  getSerial() {
    return parseInt(this.getSoa().values[0]);
  }

  getRecords() {
    this.parsed || this.parseFile();
    return this.records;
  }

  parseFile() {

    let i, line, ttl, match, fqdn,
    origin = '.',
    inSoa = false;

    const lines = this.content.split("\n");

    for( i = 0; i < lines.length; i++ ) {
      // Strip comments, IN and whitespaces
      line = lines[i].split(';')[0].replace(/\sIN/, '');
      // Skip empty lines
      if( ! line.trim().length ) continue;
      // Soa record processing
      else if( /.*\s+SOA\s+/.test(line.trim()) ) {
        inSoa = true;
        match = /^(.*)\s+SOA\s+(.*)\s+(.*)\s+\(/g.exec(line);
        this.soa.zone  = match[1].trim();
        this.soa.mname = match[2].trim();
        this.soa.rname = match[3].trim();
      } else if( inSoa ) {
        inSoa = ! /\)/.test(line.trim());     
        match = /^(\d+)/.exec(line.trim());
        if( match ) this.soa.values.push(match[1]);
        if( ! inSoa ) this.soa.fqdn = `${this.soa.zone}${origin}`.replace(/\.$/, '').replace(/^@/, ''); // If end of SOA record, build proper zone fqdn
      }
      // Change of origin
      else if( /\$ORIGIN\s+/.test(line) ) {
        origin = line.replace('$ORIGIN', '').trim();
      }
      // Change of TTL
      else if( /\$TTL\s+/.test(line) ) {
        ttl = line.replace('$TTL', '').trim();
      }
      // Other Resource Records
      else {
        // ToDo: enhance rr matching with record types list
        //        name       ttl                 rr type                 data
        match = /^(.*)\s+(\d{1,5})?\s*(A|AAAA|CNAME|NS|MX|PTR|SRV|TXT)\s+(.*)$/.exec(line);
        if( match ) {
          fqdn = match[1].trim() + '.' + origin.replace(/\.$/, '');
          fqdn = fqdn.replace(this.soa.fqdn, '').replace(/\.+$/, '');
          if( fqdn === '' ) fqdn = this.records.length ? this.records[this.records.length-1].name : '@';  // on empty name, take name from last record.
          this.records.push({
            zone: this.soa.fqdn,
            type: match[3],
            name: fqdn,
            data: match[4].replace(/\"/g, '').trim(),
            ttl: ttl
          });
        // custom records?
        } else {
          this.records.push({
            zone: this.soa.fqdn,
            type: 'custom',
            name: '',
            data: line,
            ttl: ttl
          });
        }
      }
    }

    this.parsed = true;
    return true;

  }


}
