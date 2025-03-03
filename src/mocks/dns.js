// Mock implementation of the dns module
module.exports = {
  lookup: (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    // Always return localhost
    callback(null, '127.0.0.1', 4);
  },
  resolve4: (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, ['127.0.0.1']);
  },
  resolve: (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, ['127.0.0.1']);
  },
  getServers: () => ['127.0.0.1'],
  setServers: () => {},
  NODATA: 'ENODATA',
  FORMERR: 'EFORMERR',
  SERVFAIL: 'ESERVFAIL',
  NOTFOUND: 'ENOTFOUND',
  NOTIMP: 'ENOTIMP',
  REFUSED: 'EREFUSED',
  BADQUERY: 'EBADQUERY',
  BADNAME: 'EBADNAME',
  BADFAMILY: 'EBADFAMILY',
  BADRESP: 'EBADRESP',
  CONNREFUSED: 'ECONNREFUSED',
  TIMEOUT: 'ETIMEOUT',
  EOF: 'EOF',
  FILE: 'EFILE',
  NOMEM: 'ENOMEM',
  DESTRUCTION: 'EDESTRUCTION',
  BADSTR: 'EBADSTR',
  BADFLAGS: 'EBADFLAGS',
  NONAME: 'ENONAME',
  BADHINTS: 'EBADHINTS',
  NOTINITIALIZED: 'ENOTINITIALIZED',
  LOADIPHLPAPI: 'ELOADIPHLPAPI',
  ADDRGETNETWORKPARAMS: 'EADDRGETNETWORKPARAMS',
  CANCELLED: 'ECANCELLED'
};
