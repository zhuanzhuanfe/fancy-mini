import BasePlugin from './BasePlugin';
import Cookie from '../../Cookie';

/**
 * 请求管理-cookie插件
 * 在请求前后植入cookie逻辑，详见{@tutorial 2.4-cookie}
 * @extends BasePlugin
 */
class CookiePlugin extends BasePlugin{
  /**
   * cookie管理器
   * @type {Cookie}
   */
  cookie = null;

  /**
   * 构造函数
   * @param {string} [pluginName='CookiePlugin'] 插件名称，主要用于打印日志和调试，便于追溯操作源
   * @param {Cookie} cookie cookie管理器
   */
  constructor({pluginName, cookie}){
    super({
      pluginName: pluginName || 'CookiePlugin',
    });
    this.cookie = cookie;
  }

  /**
   * 在请求头中注入cookie信息
   * @param {Requester~ReqOptions} reqOptions
   * @param {Requester} requester
   */
  beforeRequest({reqOptions, requester}){
    if(!reqOptions.header)
      reqOptions.header = {};
    
    reqOptions.header.cookie = Cookie.mergeCookieStr(this.cookie.getCookie(), reqOptions.header.cookie);
  }

  /**
   * 接收返回结果头部中的cookie信息
   * @param {Requester~ReqOptions} reqOptions
   * @param {Requester~ReqRes} reqRes
   */
  afterRequest({reqOptions, reqRes}){
    //请求失败，不作处理
    if (!reqRes.succeeded)
      return;

    //请求结果中没有设置头部信息，不作处理
    if (!reqRes.cookies) //返回头部中有'Set-Cookie'时，wx.request会返回一个cookies字段
      return;
    
    //处理结果头部中的cookie信息
    for (let setStr of reqRes.cookies)
      this.cookie.setCookie(setStr);
  }
}

export default CookiePlugin;