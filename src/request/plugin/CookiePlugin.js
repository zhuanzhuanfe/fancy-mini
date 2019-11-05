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
    if (!reqRes.header)
      return;
    
    //将标头转为全小写（http标头不区分大小写）
    let header = {};
    for (let field of Object.getOwnPropertyNames(reqRes.header))
      header[field.toLowerCase()] = reqRes.header[field];
    
    //处理结果头部中的cookie信息
    if(header['set-cookie']) {
      let setCookies = header['set-cookie'].split(','); //wx.request会把返回头部中的多个set-cookie按逗号拼接
      for (let setCookie of setCookies)
        this.cookie.setCookie(setCookie);
    }
  }
}