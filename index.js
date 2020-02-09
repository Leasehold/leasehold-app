const crypto = require('crypto');
const os = require('os');

class LeaseholdApp {
  constructor({processStream}) {
    this.channel = null;
    this.options = {};
    this.appState = {
      modules: {}
    };
    this.nonce = crypto.randomBytes(8).toString('hex');
    this.os = os.platform() + os.release();
    this.processStream = processStream;
  }

  get alias() {
    return 'leasehold_app';
  }

  get dependencies() {
    return [];
  }

  get events() {
    return ['ready', 'state:updated'];
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
        handler: (action) => this.options.components[action.params]
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
          this.channel.publish('app:state:updated', this.appState);
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
    this.channel.publish('app:state:updated', this.appState);
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
      wsPort: this.appConfig.modules[mainNetworkModule].wsPort,
      httpPort: this.appConfig.modules[mainHTTPAPIModule].httpPort,
      modules: {}
    };

    (async () => {
      for await (let [data] of this.processStream.listener('message')) {
        if (data && data.event === 'appReady') {
          this.channel.publish('app:ready');
          break;
        }
      }
    })();
  }

  async unload() {}
};

module.exports = LeaseholdApp;
