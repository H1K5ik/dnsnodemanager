const fs = require('fs');
const path = require('path');


module.exports = class ConfigSaver {
  
    constructor(db) {
        this.db = db;
        this.tmpDir = './tmp';
        this.configDir = path.join(this.tmpDir, 'configs');
        this.ensureDirectories();
    }

    async createDirsAfterAddNsGroup(groupID) {

    }


}