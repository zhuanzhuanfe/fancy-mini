/**
 * @typedef {Object} WechatAuth~WxLoginRes wx.login执行结果
 * @property {boolean} succeeded 是否成功
 * @property {string} code wx.login接口返回的code
 */

import BaseAuth from './BaseAuth';
import {wxPromise, wxResolve} from '../../wxPromise';

/**
 * 微信登录鉴权模块
 * 使用微信登录时，负责根据微信提供的信息，完成校验过程，并返回对应的登录数据
 * @extends BaseAuth
 */
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
   * 微信登录：调用微信相关API，获取微信登录态
   * @return {WechatAuth~WxLoginRes} wx.login执行结果
   */
  async wxLogin(){
    return await wxResolve.login();
  }

  /**
   * 微信静默登录
   * 根据wxLoginRes.code调后端接口解密获得用户openid，根据openid查询用户表
   * 若为老用户，则能成功从数据库中找到匹配项，从而悄悄完成登录过程
   * 若为新用户，则静默登录失败
   * @param {WechatAuth~WxLoginRes} wxLoginRes wx.login执行结果
   * @param loginOptions 登录函数调用参数，参见{@link BaseLogin#login}
   * @param configOptions 登录模块配置参数，参见{@link BaseLogin#config}
   * @return {BaseAuth~LoginRes}
   */
  async loginByWxSilent({wxLoginRes, loginOptions, configOptions}){
    //根据wxLoginRes.code调后端接口获得用户信息
    return {
      succeeded: false,
      errMsg: '请覆盖loginByWxSilent函数完成查询用户信息功能',
      toastMsg: '请覆盖loginByWxSilent函数完成查询用户信息功能',
      userInfo: {},
      expireTime: -1,
      anonymousInfo: null,
    }
  }

  /**
   * 微信授权登录
   * 根据用户同意授权后从微信处拿到的信息，完成登录过程
   * @param {WechatAuth~WxLoginRes} wxLoginRes wx.login执行结果
   * @param {Object} authData 登录界面交互结果，格式同wx.getUserInfo返回结果
   * @param loginOptions 登录函数调用参数，参见{@link BaseLogin#login}
   * @param configOptions 登录模块配置参数，参见{@link BaseLogin#config}
   * @return {BaseAuth~LoginRes}
   */
  async loginByWxAuth({wxLoginRes, authData, loginOptions, configOptions}){
    //根据wxLoginRes.code和authData调后端接口获得用户信息
    return {
      succeeded: false,
      errMsg: '请覆盖loginByWxAuth函数完成注册/查询用户信息功能',
      toastMsg: '请覆盖loginByWxAuth函数完成查询用户信息功能',
      userInfo: {},
      expireTime: -1,
      anonymousInfo: null,
    }
  }
}

export default WechatAuth;