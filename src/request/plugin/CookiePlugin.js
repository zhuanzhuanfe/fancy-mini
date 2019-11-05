import BasePlugin from './BasePlugin';
import Cookie from '../../Cookie';

export default class CookiePlugin extends BasePlugin{
  cookie = null; //cookie管理器，类型：Cookie对象实例
  
  constructor({pluginName, cookie}){
    super({
      pluginName: pluginName || 'CookiePlugin',
    });
    this.cookie = cookie;
  }
  
  //在请求头中注入cookie信息
  beforeRequest({reqOptions, requester}){
    if(!reqOptions.header)
      reqOptions.header = {};
    
    reqOptions.header.cookie = Cookie.mergeCookieStr(this.cookie.getCookie(), reqOptions.header.cookie);
  }

  //接收返回结果头部中的cookie信息
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