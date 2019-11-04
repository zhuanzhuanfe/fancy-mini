import {makeAssignableMethod} from '../operationKit';

/**
 * @typedef {Object} ReqRes 接口请求结果
 * @property {boolean} succeeded 请求是否成功（服务器返回即算成功，包括404/500等，网络异常等导致请求未正常返回才算失败）
 * @property {string|Object|Arraybuffer} [data]	开发者服务器返回的数据
 * @property {number} [statusCode] 开发者服务器返回的 HTTP 状态码
 * @property {Object} [header]		开发者服务器返回的 HTTP Response Header
 * @property {string} [errMsg] 错误信息
 */

/**
 * 请求管理器，负责对接口请求进行各种封装处理
 */
export default class Requester{
  _underlayRequest = null; //底层网络api，功能格式同wx.request
  _plugins = []; //插件列表

  /**
   * 构造函数
   * @param {Object} [configOptions]
   */
  constructor(configOptions){
    configOptions && this.config(configOptions);
  }
  
  config(configOptions){
    const defaultOpts = {
      underlayRequest: wx.request,
      plugins: [],
    };

    configOptions = Object.assign({}, defaultOpts, configOptions);

    this._underlayRequest = configOptions.underlayRequest;
    this._plugins = configOptions.plugins;
    
    for (let plugin of this._plugins) {
      plugin.mount({
        requester: this,
      });
    }
  }

  /**
   * 发送请求，供外部调用
   * @public
   * @param {Object} reqOptions
   * @param {Object} [manageOptions]
   * @return {Promise<ReqRes|ReqRes.data>} 成功时返回接口数据，失败时返回完整请求结果
   */
  async request(reqOptions, manageOptions={}){
    //保存回调（兼容起见支持回调，但更建议直接使用Promise）
    let {success, fail, complete} = reqOptions;
    delete reqOptions.success;
    delete reqOptions.fail;
    delete reqOptions.complete;
    
    //发出请求
    let reqRes = await this._request({
      reqOptions,
      manageOptions: {
        thisIssuer: manageOptions.thisIssuer,
      }
    });
    
    //处理回调
    if (reqRes.succeeded) {
      success && success(reqRes);
      complete && complete(reqRes);
    } else {
      fail && fail(reqRes);
      complete && complete(reqRes);
    }
    
    //返回结果
    return reqRes.succeeded ? Promise.resolve(reqRes.data) : Promise.reject(reqRes);
  }

  /**
   * 在requester对象上注册方法，用于提供便捷调用 
   * e.g.注册requestWithLogin方法便于直接进行需要登录态的接口调用
   * @param {string} methodName 方法名
   * @param {Function} methodFunc 方法函数
   */
  registerToThis({methodName, methodFunc}){
    if (this[methodName]) {
      console.error(`[requester] registerToThis failed, method:"${methodName}" already exist`);
      return;
    }
    
    this[methodName] = methodFunc;
  }
  
  /**
   * @param reqOptions
   * @param {Object} manageOptions
   * @param {boolean} manageOptions.disableRetry
   * @param {Object} manageOptions.thisIssuer
   * @return {Promise<ReqRes>}
   * @private
   */
  async _request({reqOptions, manageOptions={}}){
    //参数处理
    const defaultManageOpts = {
      disableRetry: false,
    };
    manageOptions = Object.assign({}, defaultManageOpts, manageOptions);
    
    //执行各插件的beforeRequest/beforeRequestAsync钩子函数
    let beforeRes = await this._beforeRequest({reqOptions, manageOptions});
    switch (beforeRes.action) {
      case 'cancel':
        let errMsg = `cancelled by plugin "${beforeRes.plugin.pluginName}" before request issued，reason: ${beforeRes.errMsg}`;
        console.warn('[Requester] 接口请求被取消，errMsg:', errMsg, 'url:', reqOptions.url);
        
        return {
          succeeded: false, 
          errMsg,
        };
      case 'continue':
        break;
      default:
        console.error('[Requester] dealing with beforeRes, unknown action:', beforeRes.action);
    } 
    
    //调用接口
    let reqRes = await this._doRequest({reqOptions, manageOptions});
    
    //执行各插件的afterRequest/afterRequestAsync钩子函数
    let afterRes = await this._afterRequest({reqOptions, reqRes, manageOptions});
    switch (afterRes.action) {
      case 'retry':
        return manageOptions.disableRetry ? reqRes : this._request({
          reqOptions,
          manageOptions: {
            ...manageOptions,
            disableRetry: true, //只允许重试一次，避免死循环
          }
        });
      case 'override':
        return afterRes.overrideRes;
      case 'continue':
        return reqRes;
      default:
        console.error('[Requester] dealing with afterRes, unknown action:', afterRes.action);
        return reqRes;
    }
  }
  
  async _beforeRequest({reqOptions, manageOptions}){
    let finalRes = {action: 'continue'};

    for (let plugin of this._plugins) {
      //调用钩子函数
      let pluginRes = await this._execPluginHook({
        plugin,
        hook: 'beforeRequest',
        args: {reqOptions},
        defaultRes: {action: 'continue'},
        manageOptions,
      });

      //处理返回结果
      switch (pluginRes.action) {
        case 'continue':
          break;
        case 'cancel':
          finalRes = {action: 'cancel', plugin, errMsg: pluginRes.errMsg};
          return finalRes;
        default:
          console.error('[Requester] beforeRequest/beforeRequestAsync, unknown action:', pluginRes.action, 'pluginName:', plugin.pluginName);
      }
    }

    return finalRes;
  }

  /**
   * 调用接口
   * @param reqOptions
   * @param manageOptions
   * @return {Promise<ReqRes>}
   * @private
   */
  async _doRequest({reqOptions, manageOptions}){
    return await new Promise((resolve)=>{
      this._underlayRequest({
        ...reqOptions,
        success(res){
          resolve(Object.assign({succeeded: true}, res))
        },
        fail(res){
          resolve(Object.assign({succeeded: false}, res))
        },
        complete: null,
      });
    });
  }
  
  async _afterRequest({reqOptions, reqRes, manageOptions}){
    let finalRes = {action: 'continue'};
    
    for (let plugin of this._plugins) {
      //调用钩子函数
      let pluginRes = await this._execPluginHook({
        plugin,
        hook: 'afterRequest',
        args: {reqOptions, reqRes},
        defaultRes: {action: 'continue'},
        manageOptions,
      });
      
      //处理返回结果
      switch (pluginRes.action) {
        case 'continue':
          break;
        case 'override':
          finalRes = {
            action: 'override',
            overrideRes: pluginRes.overrideRes
          };
          reqRes = finalRes.overrideRes;
          break;
        case 'retry':
          finalRes = {action: 'retry'};
          return finalRes;
        default:
          console.error('[Requester] afterRequest/afterRequestAsync, unknown action:', pluginRes.action, 'pluginName:', plugin.pluginName);
      }
    }
    
    return finalRes;
  }
  
  async _execPluginHook({plugin, hook, args, defaultRes, manageOptions}){
    //补充公共参数
    args = {
      ...args,
      thisIssuer: manageOptions.thisIssuer,
    };
    
    //执行插件钩子
    let syncRes = null, asyncRes = null;
    try {
      syncRes = plugin[hook] ? plugin[hook](args) : null;
      asyncRes = plugin[`${hook}Async`] ? await plugin[`${hook}Async`](args) : null;
    } catch (e) {
      console.error(`[Requester] ${hook}/${hook}Async, caught error:`, e, 'pluginName:', plugin.pluginName);
      syncRes = null;
      asyncRes = null;
    }
    
    //返回执行结果
    return Object.assign({}, defaultRes, syncRes, asyncRes);
  }

  /**
   * 将方法封装为通用函数，使之可以在任意this对象上执行
   * @param {String} methodName 方法名
   * @return {Function} 封装后的函数
   */
  makeAssignableMethod(methodName){
    return makeAssignableMethod({
      instance: this,
      method: methodName,
      rcvThis: {
        argIdx: 1,
        argProp: 'thisIssuer'
      }
    })
  }
}