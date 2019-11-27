import {makeAssignableMethod} from '../operationKit';

/**
 * 请求管理器，负责对接口请求进行各种封装处理，详见{@tutorial 2.3-request}
 */
class Requester{
  _underlayRequest = null; //底层网络api，功能格式同wx.request
  _plugins = []; //插件列表

  /**
   * 构造函数
   * @param {Object} [configOptions] 配置参数，参见{@link Requester#config}
   */
  constructor(configOptions){
    configOptions && this.config(configOptions);
  }

  /**
   * 配置
   * @param {object} configOptions
   * @param {function} [configOptions.underlayRequest] 底层网络api，功能格式同[wx.request]{@link https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html}
   * @param {Array<BasePlugin>} [configOptions.plugins] 插件列表
   */
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
   * 发送请求
   * @param {Requester~ReqOptions} reqOptions
   * @param {Requester~ManageOptions} [manageOptions]
   * @return {*|Requester~ReqRes} 成功时resolve接口数据，失败时reject完整请求结果
   * 
   * @example
   * let fetchData = requester.request({
   *   url: ''
   * });
   * 
   * fetchData.then(resp=>{ //成功时，返回结果直接是服务端返回的数据(wx.request success回调中的res.data）
   *   //resp数据格式，取决于服务端返回内容，和请求header中dataType等字段的设置
   *   console.log('server data:', resp);
   * });
   * fetchData.catch(res=>{ //失败时，返回结果是完整请求结果（wx.request fail回调中的整个res）
   *   console.log('errMsg:', res.errMsg); 
   * });
   */
  async request(reqOptions, manageOptions={}){
    //保存回调（兼容起见支持回调，但更建议以Promise形式使用）
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
   * 要求新注册方法名不得与已有方法名冲突
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
   * 发出请求
   * @param {Requester~ReqOptions} reqOptions 请求参数
   * @param {Requester~ManageOptions} manageOptions 管理参数
   * @return {Requester~ReqRes} 请求结果
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
      case 'cancel': //取消接口请求
        let errMsg = `cancelled by plugin "${beforeRes.plugin.pluginName}" before request issued，reason: ${beforeRes.errMsg}`;
        console.warn('[Requester] 接口请求被取消，errMsg:', errMsg, 'url:', reqOptions.url);
        
        return {
          succeeded: false, 
          errMsg,
        };
      case 'continue': //继续默认流程
        break;
      case 'feed': //返回指定内容
        break;
      default:
        console.error('[Requester] dealing with beforeRes, unknown action:', beforeRes.action);
    } 
    
    //调用接口
    let reqRes = beforeRes.action==='feed' ? beforeRes.feedRes : await this._doRequest({reqOptions, manageOptions});
    
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

  /**
   * 处理 请求发起前 的各种扩展逻辑
   * @param {Requester~ReqOptions} reqOptions 请求参数
   * @param {Requester~ManageOptions} manageOptions 管理参数
   * @return {Requester~BeforeRequestRes} 处理结果
   * @private
   */
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

      //格式检查&规整
      switch (pluginRes.action) {
        case 'feed': //返回指定内容
          let checkRes = formatCheckReqRes(pluginRes.feedRes); //检查内容格式是否正确
          if (!checkRes.pass) { //若格式不正确，则无视该处理指令
            console.error(
              `[Requester] feedRes格式不正确：${checkRes.errMsg}，该处理已被忽略。`,
              'pluginName:', plugin.pluginName,
              'pluginRes:', pluginRes,
              'reqOptions:', reqOptions
            );
            pluginRes.action = 'continue';
          }
          break;
        default:
      }
      
      //处理返回结果
      switch (pluginRes.action) {
        case 'continue': //继续默认流程
          break;
        case 'cancel': //取消接口调用
          finalRes = {action: 'cancel', plugin, errMsg: pluginRes.errMsg};
          return finalRes;
        case 'feed': //返回指定内容
          finalRes = {action: 'feed', plugin, errMsg: pluginRes.errMsg, feedRes: pluginRes.feedRes};
          return finalRes;
        default:
          console.error('[Requester] beforeRequest/beforeRequestAsync, unknown action:', pluginRes.action, 'pluginName:', plugin.pluginName);
      }
    }

    return finalRes;
  }

  /**
   * 调用接口
   * @param {Requester~ReqOptions} reqOptions 请求参数
   * @param {Requester~ManageOptions} manageOptions 管理参数
   * @return {Requester~ReqRes} 请求结果
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

  /**
   * 处理 请求返回后 的各种扩展逻辑
   * @param {Requester~ReqOptions} reqOptions 请求参数
   * @param {Requester~ReqRes} 请求结果
   * @param {Requester~ManageOptions} manageOptions 管理参数
   * @return {Requester~AfterRequestRes} 处理结果
   * @private
   */
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

      //格式检查&规整
      switch (pluginRes.action) {
        case 'override': 
          let checkRes = formatCheckReqRes(pluginRes.overrideRes); //检查内容格式是否正确
          if (!checkRes.pass) { //若格式不正确，则无视该处理指令
            console.error(
              `[Requester] overrideRes格式不正确：${checkRes.errMsg}，该处理已被忽略。`,
              'pluginName:', plugin.pluginName,
              'pluginRes:', pluginRes,
              'reqOptions:', reqOptions
            );
            pluginRes.action = 'continue';
          }
          break;
        default:
      }
      
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

  /**
   * 执行插件的钩子函数
   * @param {BasePlugin} plugin 插件
   * @param {string} hook 钩子
   * @param {object} args 传给钩子函数的参数
   * @param {object} defaultRes 钩子函数默认返回值
   * @param {Requester~ManageOptions} manageOptions 管理选项
   * @return {object} 钩子函数最终返回值
   * @private
   */
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
   * @param {string} methodName 方法名
   * @return {function} 封装后的函数
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

/**
 * @typedef {object} Requester~ReqOptions 接口请求参数，格式同[wx.request]{@link https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html}
 * @property {string} url 开发者服务器接口地址
 * @property {string|object|ArrayBuffer} [data] 请求的参数
 * @property {object} [header] 设置请求的 header，header 中不能设置 Referer
 * @property {string} [method='GET'] HTTP 请求方法
 * @property {string} [dataType='json'] 返回的数据格式
 * @property {string} [responseType='text'] 响应的数据类型
 * @property {function} [success] 兼容起见支持回调，但更建议以Promise形式使用
 * @property {function} [fail] 兼容起见支持回调，但更建议以Promise形式使用
 * @property {function} [complete] 兼容起见支持回调，但更建议以Promise形式使用
 */

/**
 * @typedef {object} Requester~ManageOptions 接口请求管理选项
 * @property {object} thisIssuer 发起接口请求的this对象
 * @property {boolean} disableRetry 是否禁止重试（避免无限次重试接口调用导致死循环）
 */

/**
 * @typedef {object} Requester~ReqRes 接口请求结果，除标注了“模块补充”的字段外，格式同[wx.request]{@link https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html}
 * @property {boolean} succeeded 模块补充字段，请求是否成功（服务器返回即算成功，包括404/500等，网络异常等导致请求未正常返回才算失败）
 * @property {string|Object|ArrayBuffer} [data]	（成功时）开发者服务器返回的数据
 * @property {number} [statusCode] （成功时）开发者服务器返回的 HTTP 状态码
 * @property {Object} [header]	（成功时）开发者服务器返回的 HTTP Response Header
 * @property {string} [errMsg] （失败时）错误信息
 */
/**
 * 格式检查，判断传入的数据是否符合Requester~ReqRes格式要求
 * @param {*} res 待判断的数据
 * @return {{pass: boolean, errMsg: string}}
 * @ignore
 */
function formatCheckReqRes(res) {
  if (!res) {
    return {
      pass: false,
      errMsg: '应为对象格式'
    }
  }
  
  if (typeof res.succeeded !== 'boolean') {
    return {
      pass: false,
      errMsg: '“succeeded”字段应为boolean类型'
    }
  }
  
  if (res.succeeded && !("data" in res)) {
    return {
      pass: false,
      errMsg: '“data”字段缺失'
    }
  }
  
  return {
    pass: true,
    errMsg: 'ok'
  }
}

/**
 * @typedef {object} Requester~BeforeRequestRes 请求发起前的各种扩展逻辑处理结果
 * @property {string} action 期望的后续处理：'continue'-继续 | 'cancel'-终止该请求 | 'feed'-返回指定内容（如接口缓存、mock数据等）
 * @property {string} errMsg 错误信息
 * @property {Requester~ReqRes} feedRes (action==='feed'时)指定的返回内容
 * @property {BasePlugin} plugin 决定该处理方式的插件（该字段会自动添加，插件钩子函数中无需返回）
 */

/**
 * @typedef {object} Requester~AfterRequestRes 请求返回后的各种扩展逻辑处理结果
 * @property {string} action 期望的后续处理：'continue'-继续 | 'override'-以指定内容作为请求结果返回 | 'retry'-重新发送请求，并以重试结果作为本次请求结果返回
 * @property {Requester~ReqRes} [overrideRes] action==='override'时，作为请求结果的指定内容
 */
export default Requester;