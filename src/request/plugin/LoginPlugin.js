import BasePlugin from "./BasePlugin";
import {makeAssignableMethod} from '../../operationKit';

/**
 * 登录插件
 * 在请求前后植入登录态逻辑
 */
class LoginPlugin extends BasePlugin{
  loginCenter = null;
  apiAuthFailChecker = null;
  
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
   * http请求，封装了登录逻辑，保证调用接口时具有登录态
   * @param {Object} reqOptions 调用参数，格式同request
   * @param {Object} reqOptions.loginOpts 登录参数，格式同login
   * @param {Object} [manageOptions] 管理参数，格式同request
   * @return {Promise} 请求结果，格式同request
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

export default LoginPlugin;