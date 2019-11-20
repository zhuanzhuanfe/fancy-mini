import BasePlugin from './BasePlugin';

/**
 * 请求管理-表单插件
 * 在请求前后植入表单处理逻辑，详见{@tutorial 2.3-request}
 * @extends BasePlugin
 */
class FormPlugin extends BasePlugin{
  defaultContentType = '';

  /**
   * 构造函数
   * @param {string} [pluginName='FormPlugin'] 插件名称
   * @param {string} [defaultContentType='application/x-www-form-urlencoded'] 默认表单类型
   */
  constructor({pluginName, defaultContentType}={}){
    super({
      pluginName: pluginName || 'FormPlugin'
    });
    this.defaultContentType = defaultContentType || 'application/x-www-form-urlencoded';
  }

  /**
   * 在请求发起前植入表单处理逻辑：
   * 1. 将请求头部中的content-type默认值改为构造函数中指定的defaultContentType
   * 2. 将参数中的数组和对象转为json格式，避免被自动转为类似"[object Object]"的无语义字符串
   * @param reqOptions
   */
  beforeRequest({reqOptions}){
    //设置默认content-type
    reqOptions.header = reqOptions.header || {};
    reqOptions.header['content-type'] = reqOptions.header['content-type'] || this.defaultContentType;

    //将参数中的数组和对象转为json格式，避免被自动转为类似"[object Object]"的无语义字符串
    if (reqOptions.header['content-type'].toLowerCase()==='application/x-www-form-urlencoded'){
      reqOptions.data = reqOptions.data || {};
      for (let name in reqOptions.data) {
        if (typeof reqOptions.data[name] === "object")
          reqOptions.data[name] = JSON.stringify(reqOptions.data[name]);
      }
    }
  }
}

export default FormPlugin;