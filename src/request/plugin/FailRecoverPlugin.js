import BasePlugin from './BasePlugin';

/**
 * 请求管理-网络异常处理插件
 * 在请求前后植入网络异常处理逻辑，详见{@tutorial 2.3-request}
 * @extends BasePlugin
 */
class FailRecoverPlugin extends BasePlugin{
  requestFailRecoverer = null;

  /**
   * 构造函数
   * @param {string} [pluginName='FailRecoverPlugin'] 插件名称，主要用于打印日志和调试，便于追溯操作源
   * @param {FailRecoverPlugin~RequestFailRecoverer} requestFailRecoverer 网络异常处理函数
   */
  constructor({pluginName, requestFailRecoverer}){
    super({
      pluginName: pluginName || 'FailRecoverPlugin'
    });
    this.requestFailRecoverer = requestFailRecoverer;  
  }

  /**
   * 在接口请求返回后检查并植入网络异常处理逻辑
   * @param {Requester~ReqOptions} reqOptions  请求参数
   * @param {object} thisIssuer 发起接口请求的this对象
   * @param {Requester~ReqRes} reqRes 请求结果
   * @return {undefined | Requester~AfterRequestRes} 期望的后续处理，undefined表示继续执行默认流程
   */
  async afterRequestAsync({reqOptions, reqRes, thisIssuer}){
    //未配置处理函数，默认不处理
    if (!this.requestFailRecoverer)
      return;
    
    //网络正常，无需处理
    if (reqRes.succeeded)
      return;
    
    //网络异常处理机制
    let overrideRes = new Promise((resolve, reject)=>{
      this.requestFailRecoverer.call(thisIssuer, {
        res: reqRes,
        options: reqOptions,
        resolve,
        reject,
      });
    });
    
    return {
      action: 'override',
      overrideRes
    }
  }
}

/**
 * @typedef {function} FailRecoverPlugin~RequestFailRecoverer 网络异常处理函数
 * @param {Requester~ReqRes} res 接口请求结果
 * @param {Requester~ReqOptions} options 接口请求参数
 * @param {function} resolve 重试成功时回调重试结果
 * @param {function} reject 重试失败时回调失败原因
 * @example
 * function requestFailRecoverer({res, options, resolve, reject}){
 *   //展示网络异常界面，提示用户“点击屏幕任意位置重试”
 *   //点击重试
 *   //重试成功，resolve(重试后的请求结果)
 *   //发生异常，reject(异常详情)
 *   
 *   console.log('this:', this); //另，调用时this对象会设置为：发起请求的this对象
 * }
 */

export default FailRecoverPlugin;