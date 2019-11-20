import BasePlugin from "./BasePlugin";

/**
 * 请求管理-快捷插件
 * 在请求前后植入指定处理逻辑，详见{@tutorial 2.3-request}
 * @extends BasePlugin
 */
class InstantPlugin extends BasePlugin{
  hooks = {};

  /**
   * 构造函数
   * @param {object} options
   * @param {string} options.pluginName 插件名称，主要用于打印日志和调试，便于追溯操作源
   * @param {function} [options.beforeRequest] 钩子函数，详见{@link BasePlugin#beforeRequest}
   * @param {function} [options.beforeRequestAsync] 钩子函数，详见{@link BasePlugin#beforeRequestAsync}
   * @param {function} [options.afterRequest] 钩子函数，详见{@link BasePlugin#afterRequest}
   * @param {function} [options.afterRequestAsync] 钩子函数，详见{@link BasePlugin#afterRequestAsync}
   */
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

export default InstantPlugin;