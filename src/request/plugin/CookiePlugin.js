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
    if (!reqRes.succeeded)
      return;
    
    if(reqRes.header && reqRes.header['set-cookie']) {
      let setCookies = Array.isArray(reqRes.header['set-cookie']) ? reqRes.header['set-cookie'] : [reqRes.header['set-cookie']];
      for (let setCookie of setCookies)
        this.cookie.setCookie(setCookie);
    }
  }
}