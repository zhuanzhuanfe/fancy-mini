import BasePlugin from './BasePlugin';
import Cookie from '../../Cookie';

/**
 * 请求管理-云函数插件
 * 将云函数封装成http接口形式使用，便于：
 * 1. 使用requester提供的各种逻辑扩展能力
 * 2. 后续在云函数和后端服务器之间进行各种业务的相互迁移
 * 
 * 详见{@tutorial 2.3-request}
 * @extends BasePlugin
 */
class CloudFuncPlugin extends BasePlugin{
  _fakeDomain = '';
  _fakeRootPath = '';

  /**
   * 构造函数
   * @param {string} [pluginName='CloudFuncPlugin'] 插件名称
   * @param {string} [fakeDomain='cloud.function'] 虚拟域名
   * @param {string} [fakeRootPath='/'] 虚拟根路径
   * @example 使用默认配置
   * let requester = new Requester({
   *   plugins: [
   *     new CloudFuncPlugin() //使用默认配置
   *   ]
   * });
   * 
   * //则调用接口 
   * let res = await requester.request({
   *   url: 'https://cloud.function/xxx?a=1&b=2'
   * });
   * //等价于调用云函数 
   * let res = await wx.cloud.callFunction({
   *   name: 'xxx',
   *   data: {
   *     a: "1",
   *     b: "2",
   *   }
   * })
   *
   * @example 自定义虚拟域名和虚拟路径
   * let requester = new Requester({
   *   plugins: [
   *     new CloudFuncPlugin({ //自定义虚拟域名和虚拟路径
   *       fakeDomain: 'fancy.com',
   *       fakeRootPath: '/demos/cloud/'
   *     })
   *   ]
   * });
   *
   * //则调用指定虚拟域名虚拟路径下的接口
   * let res = await requester.request({
   *   url: 'https://fancy.com/demos/cloud/xxx?a=1&b=2'
   * });
   * //等价于调用对应云函数
   * let res = await wx.cloud.callFunction({
   *   name: 'xxx',
   *   data: {
   *     a: "1",
   *     b: "2",
   *   }
   * })
   * 
   * @example 云函数实现
   *  exports.main = async (event, context) => {
        //云函数格式约定：
        
        let {a, b} = event; //调用方传入的参数可以通过event获取
        a = Number(a); //参数类型统一为string
        b = Number(b);
      
        //此外，还会额外拼入一些http相关参数
        let {reqHeader} = event; //http请求header信息
        console.log(reqHeader.cookie); //header中的cookie字段会解析成对象格式，形如：{uid: 'xxx'}
      
        //处理结果正常返回
        let result = { sum: a+b };
        
        //此外，有一些保留字段可以用于设置http相关参数
        result.resStatusCode = 200; //设置http状态码
        result.resHeader = {}; //设置http返回结果中的header信息
        result.resHeader['Set-Cookie'] = [ //同一header有多条记录时，以数组形式设置
          'uid=xxx;expires=111',
          'sessionKey=yyy;expires=222'
        ] 
        
        return result;
      }

   */
  constructor({pluginName='CloudFuncPlugin', fakeDomain='cloud.function', fakeRootPath='/'}={}){
    super({
      pluginName
    });
    
    //参数处理
    //在路径前后补充斜杠
    fakeRootPath = /\/$/.test(fakeRootPath) ? fakeRootPath : fakeRootPath+'/';
    fakeRootPath = /^\//.test(fakeRootPath) ? fakeRootPath : '/'+fakeRootPath;
    
    //参数配置
    this._fakeDomain = fakeDomain;
    this._fakeRootPath = fakeRootPath;
  }
  
  async beforeRequestAsync({reqOptions}){
    //将http请求解析成云函数调用
    let {hit, funcName, funcParams} = this._parseReq({reqOptions});
    if (!hit) //不是云函数调用，不作处理
      return;
    
    //调用云函数
    let cloudRes = await this._execCloudFunc({funcName, funcParams});
    
    //将云函数返回结果解析成http请求结果
    let reqRes = this._parseRes({cloudRes});
    
    //返回结果
    return {
      action: 'feed',
      feedRes: reqRes,
    }
  }

  /**
   * 解析请求，将http请求解析成云函数调用
   * @param {Requester~ReqOptions} reqOptions
   * @return {{hit: boolean, funcName: string, funcParams: object}} 解析结果，格式形如：{
   *   hit: true,  //是否为云函数调用
   *   funcName: 'xxx', //云函数函数名
   *   funcParams: { //云函数入参
   *    a: "1",
   *    b: "2",
   *    reqHeader: {}
   *   }
   * }
   * @protected
   */
  _parseReq({reqOptions}){
    //判断是否云函数调用
    if (reqOptions.url.indexOf(`https://${this._fakeDomain}${this._fakeRootPath}`) !== 0)
      return {hit: false};

    //参数解析
    let [path, queryStr=''] = reqOptions.url.split('?');
    let queryObj = {};
    queryStr.split('&').forEach(paramStr=>{
      let [name, value] = paramStr.split('=');
      if (name && value!==undefined)
        queryObj[name] = value;
    });

    let funcName = path.substring(`https://${this._fakeDomain}${this._fakeRootPath}`.length);
    let funcParams = Object.assign(queryObj, reqOptions.data);

    //参数处理

    // 调用网络请求时，不管参数原本是什么类型，传到后端时都会被转为string
    // 因而，在使用网络请求时调用方很可能不会特别关注实际类型，也不会主动做类型转换
    // 故，此处也统一进行类型规整，避免产生类型歧义
    for (let name in funcParams)
      funcParams[name] = String(funcParams[name]);
    
    //header解析
    let reqHeader = Object.assign({}, reqOptions.header);
    reqHeader.cookie = Cookie.cookieStrToObj(reqHeader.cookie);
    
    //header写入
    funcParams.reqHeader = reqHeader;
    
    //返回结果
    return {
      hit: true,
      funcName,
      funcParams,
    }
  }

  /**
   * 执行云函数
   * @param {string} funcName 函数名
   * @param {object} funcParams 函数入参
   * @return {{succeeded: boolean, result: object}} 云函数执行结果
   * @protected
   */
  async _execCloudFunc({funcName, funcParams}){
    try {
      let cloudRes = await wx.cloud.callFunction({
        name: funcName,
        data: funcParams
      });
      
      return {
        succeeded: true,
        ...cloudRes,
      };
    } catch (e) {
      console.error('[CloudFuncPlugin] failed to exec cloud func:',funcName, 'err:', e);
      return {
        succeeded: false,
        errMsg: 'failed to exec cloud func:'+funcName
      }
    }
  }

  /**
   * 解析返回结果，将云函数返回结果解析成http请求结果
   * @param {{succeeded: boolean, result: object}} cloudRes 云函数执行结果
   * @return {Requester~ReqRes} 对应的http请求结果
   * @protected
   */
  _parseRes({cloudRes}){
    //云函数执行失败
    if (!cloudRes.succeeded) {
      return {
        succeeded: false,
        errMsg: cloudRes.errMsg,
      }
    }
    
    //云函数执行成功
    
    //解析返回结果
    let result = cloudRes.result;
    
    //约定的保留字段，用于进行http相关设置
    let httpFieldMap = { //key: http字段  value：对应的保留字段
      statusCode: 'resStatusCode', //状态码
      header: 'resHeader', //头部
    };
    
    //提取保留字段，并从结果中删除
    let httpField = {};
    for (let [httpName, cloudName] of Object.entries(httpFieldMap)) {
      httpField[httpName] = result[cloudName];
      delete result[cloudName];
    }
    
    //http字段处理
    //状态码
    httpField.statusCode = httpField.statusCode ? Number(httpField.statusCode) : 200;
    
    //头部
    httpField.header = httpField.header || {};
    for (let name in httpField.header)
      httpField.header[name.toLowerCase()] = httpField.header[name];
    
    //cookie（返回头部中有'set-cookie'时，wx.request会额外返回一个cookies字段，此处予以相同处理）
    let cookies = Array.isArray(httpField.header['set-cookie']) ? httpField.header['set-cookie'] : [httpField.header['set-cookie']];
    cookies = cookies.filter(setStr=>!!setStr);
      
    //返回结果
    return {
      succeeded: true,
      errMsg: 'ok',
      data: result,
      statusCode: httpField.statusCode,
      header: httpField.header,
      cookies,
    };
  }
}

export default CloudFuncPlugin;