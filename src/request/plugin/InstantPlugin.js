import BasePlugin from "./BasePlugin";

export default class InstantPlugin extends BasePlugin{
  hooks = {};
  
  constructor(options){
    super({
      pluginName: options.pluginName
    });
    this.hooks = {
      beforeRequest: options.beforeRequest,
      beforeRequestAsync: options.beforeRequestAsync,
      afterRequest: options.afterRequest,
      afterRequestAsync: options.afterRequestAsync,
    };
  }

  beforeRequest(...args){
    return this.hooks.beforeRequest && this.hooks.beforeRequest.apply(this, args);
  }
  async beforeRequestAsync(...args){
    return this.hooks.beforeRequestAsync && this.hooks.beforeRequestAsync.apply(this, args);
  }
  afterRequest(...args){
    return this.hooks.afterRequest && this.hooks.afterRequest.apply(this, args);
  }
  async afterRequestAsync(...args){
    return this.hooks.afterRequestAsync && this.hooks.afterRequestAsync.apply(this, args);
  }
}