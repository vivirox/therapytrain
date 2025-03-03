// Mock implementation of the cluster module
const EventEmitter = require('events');

const cluster = new EventEmitter();

// Basic properties
cluster.isMaster = true;
cluster.isWorker = false;
cluster.isPrimary = true;
cluster.schedulingPolicy = 0; // SCHED_NONE
cluster.SCHED_NONE = 0;
cluster.SCHED_RR = 1;
cluster.settings = {
  exec: '',
  args: [],
  silent: false,
  stdio: ['pipe', 'pipe', 'pipe'],
  uid: process.getuid ? process.getuid() : null,
  gid: process.getgid ? process.getgid() : null
};

// Workers map
cluster.workers = {};

// Methods
cluster.fork = (env) => {
  const worker = new EventEmitter();
  const id = Math.floor(Math.random() * 1000).toString();
  
  worker.id = id;
  worker.process = {
    pid: Math.floor(Math.random() * 10000)
  };
  worker.isDead = () => false;
  worker.isConnected = () => true;
  worker.kill = () => {};
  worker.disconnect = () => {};
  worker.send = () => true;
  
  cluster.workers[id] = worker;
  
  return worker;
};

cluster.setupMaster = (settings) => {
  Object.assign(cluster.settings, settings || {});
};

cluster.setupPrimary = cluster.setupMaster;

cluster.disconnect = (callback) => {
  if (callback) {
    process.nextTick(callback);
  }
};

module.exports = cluster;
