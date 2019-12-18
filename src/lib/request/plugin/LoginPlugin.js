import BasePlugin from "./BasePlugin";
import {makeAssignableMethod} from '../../operationKit';

/**
 * 请求管理-登录插件
 * 在请求前后植入登录态检查和处理逻辑，详见{@tutorial 2.1-login}
 * @extends BasePlugin
 */
class LoginPlugin extends BasePlugin{
  /**
   * 登录中心
   * @ignore
   * @type {BaseLogin}
   */
  loginCenter = null;
  /**
   * 登录态失效校验函数
   * @ignore
   * @type {LoginPlugin~ApiAuthFailChecker}
   */
  apiAuthFailChecker = null;

  /**
   * 构造函数
   * @param {string} [pluginName='LoginPlugin'] 插件名称
   * @param {BaseLogin} loginCenter 登录中心
   * @param {LoginPlugin~ApiAuthFailChecker} apiAuthFailChecker 登录态失效校验函数
   */
  constructor({pluginName, loginCenter, apiAuthFailChecker}){
    super({
      pluginName: pluginName || 'LoginPlugin'
    });
    this.loginCenter = loginCenter;
    this.apiAuthFailChecker = apiAuthFailChecker;
  }

  mount(...args){
    super.mount(...args);
    this.requester.registerToThis({
      methodName: 'requestWithLogin',
      methodFunc: makeAssignableMethod({
        instance: this,
        method: 'requestWithLogin',
        rcvThis: {
          argIdx: 1,
          argProp: 'thisIssuer'
        }
      }),
    });
  }
  
  /**
   * 需要登录态的http请求，会在请求前后自动加入登录态相关逻辑：
   * 1. 请求发出前，若未登录，则先触发登录，然后再发送接口请求
   * 2. 请求返回后，若判断后端登录态已失效，则自动重新登录重新发送接口请求，并以重新请求的结果作为本次调用结果返回
   * 
   * 本函数会注册到requester对象上，可以直接通过requester.requestWithLogin()调用
   * @param {Requester~ReqOptions} reqOptions 请求参数
   * @param {object} [reqOptions.loginOpts] 额外附增字段：登录参数，格式同{@link BaseLogin#login}
   * @param {Requester~ManageOptions} [manageOptions] 管理参数
   * @return {*|Requester~ReqRes} 请求结果，格式同{@link Requester#request}
   * 
   * @example
   * let fetchData = requester.requestWithLogin({
   *   url: '', //正常设置url、data、method等各种请求选项
   *   loginOpts: { //额外定义一个保留字段loginOpts，用于指定登录参数
   *     mode: 'silent'
   *   }
   * });
   */
  async requestWithLogin(reqOptions, manageOptions={}){
    reqOptions.needLogin = true;
    return this.requester.request(reqOptions, manageOptions);
  }
  
  async beforeRequestAsync({reqOptions, thisIssuer}){
    //检查是否需要登录态
    if (!reqOptions.needLogin)
      return;

    //获取登录态
    let loginRes = await this.loginCenter.login(reqOptions.loginOpts, {thisIssuer});

    //判断是否需要取消接口调用
    return (loginRes.code===0 || loginRes.code===-200) ? {action: 'continue'} : {action: 'cancel', errMsg: '登录失败'};
  }

  async afterRequestAsync({reqOptions, reqRes, thisIssuer}){
    //检查是否需要登录态
    if (!reqOptions.needLogin)
      return;
    
    //判断后端登录态是否失效
    let isAuthFail = this.apiAuthFailChecker(reqRes.data, reqOptions);
    
    //未失效，正常返回请求结果
    if (!isAuthFail)
      return;
    
    //已失效，清除前端登录态
    this.loginCenter.clearLogin();
    
    //重新登录，重新发送接口请求，以重新请求的结果作为本次调用结果返回
    return {
      action: 'retry',
    }
  }
}

/**
 * @typedef {function} LoginPlugin~ApiAuthFailChecker 登录态失效校验函数，根据接口返回内容判断后端登录态是否失效
 * @param {*} resData 后端接口返回内容
 * @param {Requester~ReqOptions} reqOptions 请求参数
 * @return {boolean} 后端登录态是否失效
 * @example
 * function apiAuthFailChecker(resData, reqOptions){
 *   return (
 *     resData.respMsg.includes('请登录') || //后端登录态失效通用判断条件
 *     (reqOptions.url.includes('/bizA/') && resData.respCode===-1) || //业务线A后端接口登录态失效
 *     (reqOptions.url.includes('/bizB/') && resData.respCode===-2) //业务线B后端接口登录态失效
 *   );
 * }
 */

export default LoginPlugin;