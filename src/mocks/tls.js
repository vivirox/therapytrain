// Mock implementation of the tls module
const EventEmitter = require('events');
const net = require('./net');

class TLSSocket extends EventEmitter {
  constructor(socket, options) {
    super();
    this.socket = socket || new net.Socket();
    this.options = options || {};
    this.authorized = true;
    this.encrypted = true;
    this.connecting = false;
    this.destroyed = false;
    this.readable = true;
    this.writable = true;
  }

  connect(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    this.connecting = true;
    
    // Simulate successful connection after a short delay
    setTimeout(() => {
      this.connecting = false;
      this.emit('secureConnect');
      if (callback) callback();
    }, 10);
    
    return this;
  }

  write(data, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }
    
    // Simulate successful write
    if (callback) {
      setTimeout(() => callback(), 5);
    }
    
    return true;
  }

  end(data, encoding, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = null;
    }
    
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }
    
    // Simulate successful end
    setTimeout(() => {
      this.emit('end');
      if (callback) callback();
    }, 5);
    
    return this;
  }

  destroy() {
    this.destroyed = true;
    return this;
  }

  setTimeout(timeout, callback) {
    // No-op
    if (callback) {
      this.once('timeout', callback);
    }
    return this;
  }

  setNoDelay(noDelay) {
    // No-op
    return this;
  }

  setKeepAlive(enable, initialDelay) {
    // No-op
    return this;
  }
}

module.exports = {
  TLSSocket,
  connect: (options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    const socket = new TLSSocket(null, options);
    return socket.connect(options, callback);
  },
  createServer: (options, secureConnectionListener) => {
    if (typeof options === 'function') {
      secureConnectionListener = options;
      options = {};
    }
    
    const server = new EventEmitter();
    server.listen = () => server;
    server.close = (callback) => {
      if (callback) callback();
      return server;
    };
    
    return server;
  },
  getCiphers: () => ['ECDHE-RSA-AES128-GCM-SHA256'],
  DEFAULT_ECDH_CURVE: 'auto',
  DEFAULT_MAX_VERSION: 'TLSv1.3',
  DEFAULT_MIN_VERSION: 'TLSv1.2',
  rootCertificates: []
};
