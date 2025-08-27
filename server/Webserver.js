const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const helmet = require('helmet');
const express = require('express');
const bodyParser = require('body-parser');

module.exports = {

  async init() {
    this.server = express();
    this.router = express.Router();
    this.server.use(helmet({contentSecurityPolicy: false}));
    this.server.use(bodyParser.urlencoded({limit: APP.config.web.limits.uploadFileSize, extended: false}));
    this.server.use(bodyParser.json({limit: APP.config.web.limits.uploadFileSize}));
    this.server.use(require('cookie-parser')());
    this.server.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
    this.server.use(require('express-fileupload')());
    this.server.set('trust proxy', 'loopback');
  },

  async serveFrontend() {
    this.server.use('/', express.static(path.join(__dirname, '../output_test/build')));
    // Catch-all route for production
    this.server.get('/*', function(req, res) {
      res.sendFile(path.join(__dirname, '../output_test/build/index.html'), function(err) {
        if(err) res.status(500).send(err);
      });
    });
  },

  async serveApi() {
    this.server.use('/API', this.router);
  },

  async listen() {
    // Server startup with ssl
    if( APP.config.web.https.enabled ) {
      const crypto = { key: fs.readFileSync(APP.config.web.https.key), cert: fs.readFileSync(APP.config.web.https.cert) };
      https.createServer(crypto, this.server).listen(APP.config.web.https.port, APP.config.web.https.address, () => {
        console.log(`Web interface up on ${APP.config.web.http.address}:${APP.config.web.https.port} with ssl`);
      });
      http.createServer( (req, res) => {
        res.writeHead(302, {Location: 'https://' + req.headers.host.replace(APP.config.web.http.port, APP.config.web.https.port) + req.url});
        res.end();
      } ).listen(APP.config.web.http.port, APP.config.web.http.address);
    // Server startup as http
    } else {
      http.createServer(this.server).listen(APP.config.web.http.port, APP.config.web.http.address, () => {
        console.log(`Web interface up on ${APP.config.web.http.address}:${APP.config.web.http.port}`);
      });
    }
  }


}
