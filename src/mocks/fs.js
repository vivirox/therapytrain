// Mock implementation of the fs module
const EventEmitter = require('events');

class Stats {
  constructor(options) {
    this.dev = 0;
    this.ino = 0;
    this.mode = 0;
    this.nlink = 0;
    this.uid = 0;
    this.gid = 0;
    this.rdev = 0;
    this.size = 0;
    this.blksize = 0;
    this.blocks = 0;
    this.atimeMs = 0;
    this.mtimeMs = 0;
    this.ctimeMs = 0;
    this.birthtimeMs = 0;
    this.atime = new Date(0);
    this.mtime = new Date(0);
    this.ctime = new Date(0);
    this.birthtime = new Date(0);
    
    if (options && options.isDirectory) {
      this._isDirectory = true;
    } else {
      this._isDirectory = false;
    }
    
    if (options && options.isFile) {
      this._isFile = true;
    } else {
      this._isFile = false;
    }
  }
  
  isDirectory() {
    return this._isDirectory;
  }
  
  isFile() {
    return this._isFile;
  }
  
  isSymbolicLink() {
    return false;
  }
  
  isBlockDevice() {
    return false;
  }
  
  isCharacterDevice() {
    return false;
  }
  
  isFIFO() {
    return false;
  }
  
  isSocket() {
    return false;
  }
}

class ReadStream extends EventEmitter {
  constructor() {
    super();
    this.bytesRead = 0;
    this.path = '';
    this.pending = false;
    this.readable = true;
  }
  
  close() {
    this.emit('close');
  }
  
  destroy() {
    this.readable = false;
    this.emit('close');
  }
}

class WriteStream extends EventEmitter {
  constructor() {
    super();
    this.bytesWritten = 0;
    this.path = '';
    this.pending = false;
    this.writable = true;
  }
  
  close() {
    this.emit('close');
  }
  
  destroy() {
    this.writable = false;
    this.emit('close');
  }
}

// Mock in-memory file system
const mockFiles = {};

module.exports = {
  access: (path, mode, callback) => {
    if (typeof mode === 'function') {
      callback = mode;
      mode = null;
    }
    
    if (mockFiles[path]) {
      callback(null);
    } else {
      const err = new Error(`ENOENT: no such file or directory, access '${path}'`);
      err.code = 'ENOENT';
      callback(err);
    }
  },
  
  accessSync: (path, mode) => {
    if (!mockFiles[path]) {
      const err = new Error(`ENOENT: no such file or directory, access '${path}'`);
      err.code = 'ENOENT';
      throw err;
    }
  },
  
  readFile: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    if (mockFiles[path]) {
      callback(null, mockFiles[path]);
    } else {
      const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
      err.code = 'ENOENT';
      callback(err);
    }
  },
  
  readFileSync: (path, options) => {
    if (mockFiles[path]) {
      return mockFiles[path];
    } else {
      const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
      err.code = 'ENOENT';
      throw err;
    }
  },
  
  writeFile: (path, data, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    mockFiles[path] = data;
    callback(null);
  },
  
  writeFileSync: (path, data, options) => {
    mockFiles[path] = data;
  },
  
  unlink: (path, callback) => {
    delete mockFiles[path];
    callback(null);
  },
  
  unlinkSync: (path) => {
    delete mockFiles[path];
  },
  
  stat: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    if (mockFiles[path]) {
      callback(null, new Stats({ isFile: true }));
    } else {
      const err = new Error(`ENOENT: no such file or directory, stat '${path}'`);
      err.code = 'ENOENT';
      callback(err);
    }
  },
  
  statSync: (path, options) => {
    if (mockFiles[path]) {
      return new Stats({ isFile: true });
    } else {
      const err = new Error(`ENOENT: no such file or directory, stat '${path}'`);
      err.code = 'ENOENT';
      throw err;
    }
  },
  
  mkdir: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    mockFiles[path] = null;
    callback(null);
  },
  
  mkdirSync: (path, options) => {
    mockFiles[path] = null;
  },
  
  rmdir: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    delete mockFiles[path];
    callback(null);
  },
  
  rmdirSync: (path, options) => {
    delete mockFiles[path];
  },
  
  readdir: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    
    callback(null, []);
  },
  
  readdirSync: (path, options) => {
    return [];
  },
  
  createReadStream: (path, options) => {
    const stream = new ReadStream();
    
    setTimeout(() => {
      if (mockFiles[path]) {
        stream.emit('data', mockFiles[path]);
        stream.emit('end');
      } else {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
        err.code = 'ENOENT';
        stream.emit('error', err);
      }
    }, 0);
    
    return stream;
  },
  
  createWriteStream: (path, options) => {
    const stream = new WriteStream();
    
    setTimeout(() => {
      stream.emit('open');
      stream.emit('ready');
    }, 0);
    
    return stream;
  },
  
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
  },
  
  promises: {
    access: (path, mode) => {
      return new Promise((resolve, reject) => {
        module.exports.access(path, mode, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    
    readFile: (path, options) => {
      return new Promise((resolve, reject) => {
        module.exports.readFile(path, options, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    },
    
    writeFile: (path, data, options) => {
      return new Promise((resolve, reject) => {
        module.exports.writeFile(path, data, options, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    
    unlink: (path) => {
      return new Promise((resolve, reject) => {
        module.exports.unlink(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    
    stat: (path, options) => {
      return new Promise((resolve, reject) => {
        module.exports.stat(path, options, (err, stats) => {
          if (err) reject(err);
          else resolve(stats);
        });
      });
    },
    
    mkdir: (path, options) => {
      return new Promise((resolve, reject) => {
        module.exports.mkdir(path, options, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    
    rmdir: (path, options) => {
      return new Promise((resolve, reject) => {
        module.exports.rmdir(path, options, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    
    readdir: (path, options) => {
      return new Promise((resolve, reject) => {
        module.exports.readdir(path, options, (err, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });
    }
  }
};
