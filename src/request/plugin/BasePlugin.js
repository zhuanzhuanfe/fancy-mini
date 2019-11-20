/**
 * 请求管理-插件基类
 * 用于在网络请求前后添加自定义扩展逻辑，详见{@tutorial 2.3-request}
 */
class BasePlugin {
  /**
   * 插件名称，主要用于打印日志和调试，便于追溯操作源
   * @type {string}
   */
  pluginName = '';
  /**
   * 请求管理器
   * @type {Requester}
   */
  requester = null;

  /**
   * 构造函数
   * @param {string} pluginName 插件名称，主要用于打印日志和调试，便于追溯操作源
   */
  constructor({pluginName}){
    this.pluginName = pluginName || this.pluginName;
    
    if (!this.pluginName) {
      console.warn('[requester plugin] 建议为插件设置一个pluginName，便于出现问题时排查追溯：',this);
    }
  }
  
  /**
   * 钩子函数，插件被挂载到requester对象上时触发
   * @param {Requester} requester 被挂载到的requester对象
   */
  mount({requester}){
    this.requester = requester;
  }
  
  /**
   * 钩子函数，发请求之前调用，同步
   * 不会等待异步操作返回，如需等待异步逻辑，请改用{@link BasePlugin#beforeRequestAsync}
   * @param {Requester~ReqOptions} reqOptions  请求参数
   * @param {object} thisIssuer 发起接口请求的this对象
   * @return {undefined | Requester~BeforeRequestRes} 期望的后续处理，undefined表示继续执行默认流程
   */
  beforeRequest({reqOptions, thisIssuer}){};

  /**
   * 钩子函数，发请求之前调用，异步
   * 会等待async函数resolve，若无异步逻辑，建议使用{@link BasePlugin#beforeRequest}
   * @async
   * @param {Requester~ReqOptions} reqOptions  请求参数
   * @param {object} thisIssuer 发起接口请求的this对象
   * @return {undefined | Requester~BeforeRequestRes} 期望的后续处理，undefined表示继续执行默认流程
   */
  beforeRequestAsync({reqOptions, thisIssuer}){};

  /**
   * 钩子函数，请求返回之后调用，同步
   * 不会等待异步操作返回，如需等待异步逻辑，请改用{@link BasePlugin#afterRequestAsync}
   * @param {Requester~ReqOptions} reqOptions  请求参数
   * @param {object} thisIssuer 发起接口请求的this对象
   * @param {Requester~ReqRes} reqRes 请求结果
   * @return {undefined | Requester~AfterRequestRes} 期望的后续处理，undefined表示继续执行默认流程
   */
  afterRequest({reqOptions, thisIssuer, reqRes}){};
  
  /**
   * 钩子函数，请求返回之后调用，异步
   * 会等待async函数resolve，若无异步逻辑，建议使用{@link BasePlugin#afterRequest}
   * @async
   * @param {Requester~ReqOptions} reqOptions  请求参数
   * @param {object} thisIssuer 发起接口请求的this对象
   * @param {Requester~ReqRes} reqRes 请求结果
   * @return {undefined | Requester~AfterRequestRes} 期望的后续处理，undefined表示继续执行默认流程
   */
  afterRequestAsync({reqOptions, thisIssuer, reqRes}){};
}

export default BasePlugin;