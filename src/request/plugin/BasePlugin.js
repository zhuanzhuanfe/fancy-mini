export default class BasePlugin {
  pluginName = ''; //插件名称，主要用于打印日志和调试，便于追溯操作源
  requester = null;

  constructor({pluginName}){
    this.pluginName = pluginName || this.pluginName;
    
    if (!this.pluginName) {
      console.warn('[requester plugin] 建议为插件设置一个pluginName，便于出现问题时排查追溯：',this);
    }
  }
  
  /**
   * 钩子函数，插件被挂载到requester对象上时被调用
   * @param {Requester} requester 请求管理器
   */
  mount({requester}){
    this.requester = requester;
  }
  
  /**
   * 钩子函数，发请求之前调用，同步
   * 不会等待异步操作返回，如需等待异步逻辑，请改用beforeRequestAsync
   * @param {Object} reqOptions  请求参数
   * @param {*} thisIssuer 发起请求的this对象
   * @return {undefined | {action: string, errMsg: string}} 期望的后续处理：
   *    undefined - 默认
   *    {
   *      action: '', //后续处理：'cancel'-终止该请求 | 'continue'-继续发送
   *      errMsg: '', //错误信息，解释拦截原因
   *    }
   * 
   @example
   beforeRequest({reqOptions, thisIssuer}){
     return {
       action: 'continue',
       errMsg: 'ok',
     }
   }
   */
  beforeRequest({reqOptions, thisIssuer}){};

  /**
   * 钩子函数，发请求之前调用，异步
   * 会等待async函数resolve，若无异步逻辑，建议使用beforeRequest
   * @param {Object} reqOptions  请求参数
   * @param {*} thisIssuer 发起请求的this对象
   * @return {Promise<undefined | {action: 'cancel'|'continue', errMsg: string}>} 期望的后续处理：
   *    undefined - 默认
   *    {
   *      action: '', //后续处理：'cancel'-终止该请求 | 'continue'-继续发送
   *      errMsg: '', //错误信息，解释拦截原因
   *    }
   *
   @example
   async beforeRequestAsync({reqOptions, thisIssuer}){
     return {
       action: 'continue',
       errMsg: 'ok',
     }
   }
   */
  beforeRequestAsync({reqOptions, thisIssuer}){};

  /**
   * 钩子函数，请求返回之后调用，同步
   * 不会等待异步操作返回，如需等待异步逻辑，请改用afterRequestAsync
   * @param {Object} reqOptions  请求参数
   * @param {*} thisIssuer 发起请求的this对象
   * @param {RequestRes} reqRes 请求返回结果，除单独说明字段外，格式同wx.request回调结果
   * @param {boolean} reqRes.succeeded 请求成功/失败
   * @return {undefined | {action: string, errMsg: string, overrideRes: RequestRes}} 期望的后续处理：
   *    undefined - 默认
   *    {
   *      action: '', //后续处理：'continue'-继续 | 'override'-覆盖请求结果 | 'retry'-重新发送请求
   *      overrideRes: {}, //action==='override'时，以该结果覆盖原来的请求结果
   *      errMsg: '', //错误信息，解释操作原因，便于定位追溯
   *    }
   *
   @example
   afterRequest({reqOptions, thisIssuer}){
     return {
       action: 'continue',
       errMsg: 'ok',
     }
   }
   */
  afterRequest({reqOptions, thisIssuer, reqRes}){};
  
  /**
   * 钩子函数，请求返回之后调用，异步
   * 会等待async函数resolve，若无异步逻辑，建议使用afterRequest
   * @param {Object} reqOptions  请求参数
   * @param {*} thisIssuer 发起请求的this对象
   * @param {RequestRes} reqRes 请求返回结果，除单独说明字段外，格式同wx.request回调结果
   * @param {boolean} reqRes.succeeded 请求成功/失败
   * @return {Promise<undefined | {action: string, errMsg: string, overrideRes: RequestRes}>} 期望的后续处理：
   *    undefined - 默认
   *    {
   *      action: '', //后续处理：'continue'-继续 | 'override'-覆盖请求结果 | 'retry'-重新发送请求
   *      overrideRes: {}, //action==='override'时，以该结果覆盖原来的请求结果
   *      errMsg: '', //错误信息，解释操作原因，便于定位追溯
   *    }
   *
   @example
   async afterRequestAsync({reqOptions, thisIssuer}){
     return {
       action: 'continue',
       errMsg: 'ok',
     }
   }
   */
  afterRequestAsync({reqOptions, thisIssuer, reqRes}){};
}