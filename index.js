const crypto = require('crypto');
const os = require('os');

class LeaseholdApp {
  constructor() {
    this.channel = null;
    this.options = {};
    this.appState = {
      modules: {}
    };
    this.nonce = crypto.randomBytes(8).toString('hex');
    this.os = os.platform() + os.release();
  }

  get alias() {
    return 'leasehold_app';
  }

  get dependencies() {
    return [];
  }

  get events() {
    return ['state:updated'];
  }

  get actions() {
    return {
      getApplicationState: {
        handler: async (action) => ({...this.appState})
      },
      updateApplicationState: {
        handler: async (action) => {
          this.updateAppState(action.params);
        }
      },
      getComponentConfig: {
        handler: (action) => this.config.components[action.params]
      },
      getModuleState: {
        handler: (action) => this.appState.modules[action.params.moduleName]
      },
      updateModuleState: {
        handler: (action) => {
          this.appState.modules = {
            ...this.appState.modules,
            ...action.params
          };
          this.channel.publish('state:updated', this.appState);
        }
      }
    };
  }

  updateAppState(newAppState) {
    let {
      version,
      protocolVersion,
      height,
      state,
      broadhash,
      wsPort,
      httpPort,
      modules
    } = this.appState;
    this.appState = {
      version,
      protocolVersion,
      os: this.os,
      nonce: this.nonce,
      height,
      state,
      broadhash,
      wsPort,
      httpPort,
      ...newAppState,
      modules
    };
    this.channel.publish('state:updated', this.appState);
  }

  async load(channel, options) {
    this.channel = channel;
    this.options = options;
    let {mainHTTPAPIModule, mainNetworkModule} = options;
    this.appState = {
      ...options.nodeInfo,
      os: this.os,
      nonce: this.nonce,
      height: 1,
      wsPort: this.config.modules[mainNetworkModule].wsPort,
      httpPort: this.config.modules[mainHTTPAPIModule].httpPort,
      modules: {}
    };
  }

  async unload() {}
};

module.exports = LeaseholdApp;
