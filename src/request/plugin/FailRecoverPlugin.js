import BasePlugin from './BasePlugin';

class FailRecoverPlugin extends BasePlugin{
  requestFailRecoverer = null;
  
  constructor({pluginName, requestFailRecoverer}){
    super({
      pluginName: pluginName || 'FailRecoverPlugin'
    });
    this.requestFailRecoverer = requestFailRecoverer;  
  }
  async afterRequestAsync({reqOptions, reqRes, thisIssuer}){
    //未配置处理函数，默认不处理
    if (!this.requestFailRecoverer)
      return;
    
    //网络正常，无需处理
    if (reqRes.succeeded)
      return;
    
    //网络异常处理机制
    let overrideRes = new Promise((resolve, reject)=>{
      this.requestFailRecoverer.call(thisIssuer, {
        res: reqRes,
        options: reqOptions,
        resolve,
        reject,
      });
    });
    
    return {
      action: 'override',
      overrideRes
    }
  }
}

export default FailRecoverPlugin;