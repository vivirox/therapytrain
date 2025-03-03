// Mock handler for node: protocol imports
const path = require('path');

// Map of node: protocol modules to their mocks
const mocks = {
  'node:fs': path.resolve(__dirname, 'fs.js'),
  'node:os': path.resolve(__dirname, 'os.js'),
  'node:path': path.resolve(__dirname, 'empty.js'),
  'node:crypto': path.resolve(__dirname, 'empty.js'),
  'node:util': path.resolve(__dirname, 'empty.js'),
  'node:stream': path.resolve(__dirname, 'empty.js'),
  'node:buffer': path.resolve(__dirname, 'empty.js'),
  'node:child_process': path.resolve(__dirname, 'empty.js'),
  'node:dns': path.resolve(__dirname, 'dns.js'),
  'node:net': path.resolve(__dirname, 'net.js'),
  'node:tls': path.resolve(__dirname, 'tls.js'),
  'node:cluster': path.resolve(__dirname, 'cluster.js'),
};

class NodeProtocolPlugin {
  constructor() {}

  apply(resolver) {
    const target = resolver.ensureHook('resolve');
    
    resolver.getHook('resolve').tapAsync('NodeProtocolPlugin', (request, resolveContext, callback) => {
      if (request.request && request.request.startsWith('node:')) {
        const moduleName = request.request;
        
        if (mocks[moduleName]) {
          const newRequest = {
            ...request,
            request: mocks[moduleName]
          };
          
          return resolver.doResolve(target, newRequest, null, resolveContext, callback);
        }
        
        // For any other node: modules, use empty.js
        const newRequest = {
          ...request,
          request: path.resolve(__dirname, 'empty.js')
        };
        
        return resolver.doResolve(target, newRequest, null, resolveContext, callback);
      }
      
      callback();
    });
  }
}

module.exports = NodeProtocolPlugin;
