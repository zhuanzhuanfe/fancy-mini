import BaseAuth from './BaseAuth';
import {wxPromise, wxResolve} from '../../wxPromise';

class WechatAuth extends BaseAuth{
  async silentLogin({loginOptions, configOptions}){
    let wxLoginRes = await this.wxLogin();
    return this.loginByWxSilent({wxLoginRes, loginOptions, configOptions});
  }
  async beforeAuthLogin({loginOptions, configOptions}){
    let wxLoginRes = await this.wxLogin();
    return {wxLoginRes};
  }
  async authLogin({loginOptions, configOptions, beforeRes, authData}){
    return this.loginByWxAuth({
      wxLoginRes: beforeRes.wxLoginRes,
      authData,
      loginOptions,
      configOptions,
    });
  }

  /**
   * 微信登录：调用微信相关API，获取用户标识（openid，某些情况下也能获得unionid）
   * @return {Promise<Object>} 微信用户标识
   */
  async wxLogin(){
    return await wxResolve.login();
  }
  
  async loginByWxSilent({wxLoginRes, loginOptions, configOptions}){
    //根据wxLoginRes.code调后端接口获得用户信息
    return {
      succeeded: false,
      errMsg: '请覆盖loginByWxSilent函数完成查询用户信息功能',
      toastMsg: '请覆盖loginByWxSilent函数完成查询用户信息功能',
      userInfo: {},
      expireTime: -1,
    }
  }
  
  async loginByWxAuth({wxLoginRes, authData, loginOptions, configOptions}){
    //根据wxLoginRes.code和authData调后端接口获得用户信息
    return {
      succeeded: false,
      errMsg: '请覆盖loginByWxAuth函数完成注册/查询用户信息功能',
      toastMsg: '请覆盖loginByWxSilent函数完成查询用户信息功能',
      userInfo: {},
      expireTime: -1,
    }
  }
}

export default WechatAuth;