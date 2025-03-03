// Mock implementation of the net module
const EventEmitter = require('events');

class Socket extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
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
      this.emit('connect');
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
  Socket,
  createConnection: (options, callback) => {
    const socket = new Socket();
    return socket.connect(options, callback);
  },
  isIP: (input) => 0,
  isIPv4: (input) => false,
  isIPv6: (input) => false
};
