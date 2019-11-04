/**
 * cookie管理器
 * 利用前端存储，模拟实现web中的cookie逻辑
 * 很多时候，后端现有接口是先前对接M页/APP开发的，可能会使用cookie进行参数获取/传递；但小程序不支持cookie，导致后端接口复用/多端兼容成本增高。
 * 利用本cookie管理器，结合./request/plugin/CookiePlugin中的cookie插件，可以在接口调用前后，自动植入cookie逻辑，便于小程序端复用cookie相关逻辑。
 * 
 * 注：目前仅支持基础的取值赋值操作，domain、path、expires等各种配置选项暂未支持，会予以忽略
 */
export default class Cookie {
  _cookieStorage = ''; //cookie相关信息存储到storage时使用的key
  _cookieStr = ''; //当前cookie列表，格式：'key1=value1;key2=value2'

  /**
   * 构造函数
   * @param {string} cookieStorageName cookie相关信息存储到storage时使用的key
   */
  constructor({cookieStorageName='__cookie'}={}){
    this._cookieStorage = cookieStorageName;
  }

  /**
   * 读取指定cookie
   * key未传时，返回全部cookie
   * @param {string} [key] 要读取的key
   * @param {object} [options] 配置选项（暂未支持）
   * @return {string | object} cookie中key对应的value | 未传key时，返回全部key-value组成的对象
   */
  get(key, options){
    let cookieStr = this.getCookie();
    let cookieObj = Cookie.cookieStrToObj(cookieStr);
    return key === undefined ? cookieObj : (cookieObj[key] || '');
  }

  /**
   * 写入指定cookie
   * @param {string} key 要写入的key
   * @param {string} value 要写入的value
   * @param {object} [options] 配置选项（暂未支持）
   */
  set(key, value, options){
    this.setCookie(`${key}=${value};`);
  }

  /**
   * 获取当前可访问的cookie字符串
   * @return {string} cookie字符串，形如：'key1=value1;key2=value2'（类似web中读取document.cookie）
   */
  getCookie(){
    // 优先尝试从内存中读取，尽量减少访问storage的开销
    if(this._cookieStr)
      return this._cookieStr;
    
    this._cookieStr = wx.getStorageSync(this._cookieStorage);
    return this._cookieStr;
  }

  /**
   * 写入cookie
   * @param {string} setStr 写入指令，格式形如：'key1=value1; path=/;'（类似web中document.cookie赋值）
   */
  setCookie(setStr){
    //参数处理
    setStr = setStr.trim();
    
    //字段配置
    let setKey = ''; //要赋值的key
    let setValue = ''; //要赋值的value
    let configOptions = { //配置项
      'expires': '', 
      'domain': '',
      'path': '', 
      'secure': '', 
      'max-age': '', 
      'version': '',
    };
    
    //字段解析
    let fieldStrArr = setStr.split(/\s*;\s*/);
    for (let fieldStr of fieldStrArr) {
      let idx = fieldStr.indexOf('=');
      let name = fieldStr.substring(0, idx);
      let value = fieldStr.substring(idx+1);
      
      if (name.toLowerCase() in configOptions) { //配置项
        configOptions[name.toLowerCase()] = value;
      } else if (!setKey) { //第一个未知选项，认为是要赋值的key
        setKey = name;
        setValue = value;
      } else { //有多个未知选项，打warning，存在识别不正确处理不得当的风险
        console.warn('[setCookie] unknown option:',name,'for string:', setStr);
      }
    } 
    
    //字段检查
    if (!setKey) {
      console.error('[setCookie] bad param, no key found:', setStr);
      return;
    }
    
    //更新cookie（配置项暂予忽略）
    this._cookieStr = Cookie.mergeCookieStr(this._cookieStr, `${setKey}=${setValue};`);
    wx.setStorage({
      key: this._cookieStorage,
      data: this._cookieStr,
    });
  }

  /**
   * 将'key1=value1;key2=value2'形式的cookie字符串转为{key1: value1, key2: value2}的对象形式
   * @param {string} cookieStr
   * @return {Object} cookieObj
   */
  static cookieStrToObj(cookieStr){
    let fieldStrArr = cookieStr.split(/\s*;\s*/).filter(fieldStr=>!!fieldStr);
    let cookieObj = {};

    for (let fieldStr of fieldStrArr) {
      // 注意不要直接用匹配split('='), ppu等含=的不规则cookie会出错
      let index = fieldStr.indexOf('=');
      let key = fieldStr.substring(0, index);
      let value = fieldStr.substring(index+1);

      cookieObj[key] = value;
    }

    return cookieObj;
  }

  /**
   * 将{key1: value1, key2: value2}的对象形式键值对转为'key1=value1;key2=value2'形式的cookie字符串
   * @param {Object} cookieObj
   * @return {string} cookieStr
   */
  static cookieObjToStr(cookieObj){
    let cookieStr = '';
    for (let key in cookieObj)
      cookieStr += `${key}=${cookieObj[key]};`;
    return cookieStr;
  }

  /**
   * 将'key1=value1;key2=value2'形式的cookie字符串合并，key相同时后面的覆盖前面的
   * @param {string} cookieStrs
   */
  static mergeCookieStr(...cookieStrs) {
    let cookieObjs = cookieStrs.filter(cookieStr=>!!cookieStr).map(Cookie.cookieStrToObj);

    let cookieObj = Object.assign(
      {},
      ...cookieObjs,
    );

    return Cookie.cookieObjToStr(cookieObj);
  }
}


