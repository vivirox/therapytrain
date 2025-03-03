// Mock implementation of the os module
module.exports = {
  hostname: () => 'localhost',
  type: () => 'Darwin',
  platform: () => 'darwin',
  arch: () => 'x64',
  release: () => '20.0.0',
  uptime: () => 0,
  loadavg: () => [0, 0, 0],
  totalmem: () => 8589934592, // 8GB
  freemem: () => 4294967296, // 4GB
  cpus: () => [{
    model: 'Mock CPU',
    speed: 2500,
    times: {
      user: 0,
      nice: 0,
      sys: 0,
      idle: 0,
      irq: 0
    }
  }],
  networkInterfaces: () => ({
    lo0: [{
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8'
    }]
  }),
  EOL: '\n',
  constants: {
    UV_UDP_REUSEADDR: 4,
    signals: {
      SIGINT: 2,
      SIGTERM: 15
    },
    errno: {
      EADDRINUSE: -98,
      ECONNREFUSED: -61
    }
  }
};
