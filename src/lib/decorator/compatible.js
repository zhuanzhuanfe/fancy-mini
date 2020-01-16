/**
 * 修饰器，实现各种兼容用法
 * @module compatible
 */

/**
 * 提供微信api形式的回调
 * 主要适用场景：将微信api改写为promise形式后，兼容旧代码
 * 被修饰函数应该返回一个promise，成功时resolve，失败时reject，或返回{succeeded: true/false, ...}格式，通过succeeded字段标识成功失败
 * 修饰后的函数会支持arguments[0]中传入success、fail、complete属性，并根据promise结果进行回调
 * @param target
 * @param funcName
 * @param descriptor
 * 
 * @example
 * class Demo {
 *   \@supportWXCallback //自动支持success、fail、complete回调
 *   async getSystemInfo(){
 *     let sysInfo = {};//自定义getSystemInfo实现，比如加入一些缓存策略，添加一些额外字段等
 *     return {
 *       succeeded: true, //标示应该触发success回调还是fail回调
 *       ...sysInfo, //返回成功/失败对应数据
 *     }
 *   }
 *   
 *   test(){
 *     this.getSystemInfo().then(sysInfo=>{
 *       //正常以Promise形式使用
 *     });
 *     
 *     this.getSystemInfo({
 *       success(sysInfo){
 *         //同时，自动兼容回调形式使用
 *       }
 *     })
 *   }
 * }
 */
export function supportWXCallback(target, funcName, descriptor) {
  let oriFunc = descriptor.value;
  descriptor.value = function (...args) {
    //获取回调函数
    let options = args[0] || {};
    let {success, fail, complete} = options;
    
    //清除回调，避免函数体和修饰器重复处理
    delete options.success;
    delete options.fail;
    delete options.complete;
    
    //获取执行结果
    let fetchRes = oriFunc.apply(this, args);

    //格式检查
    if (!(fetchRes instanceof Promise)) {
      console.error('[supportWXCallback] 被修饰函数返回结果应为Promise，函数：', funcName, '返回值：', fetchRes);
      return fetchRes;
    }

    //触发回调
    fetchRes.then((...results)=>{
      //恢复回调配置，尽量减小对入参原始对象的影响
      options.success = success;
      options.fail = fail;
      options.complete = complete;
      
      //判断应该按成功回调还是按失败回调
      let succeeded = results[0] && typeof results[0].succeeded === "boolean" ? results[0].succeeded : true;
      
      //回调
      if (succeeded) {
        success && success(...results);
      } else {
        fail && fail(...results);
      }
      
      complete && complete(...results);
    });
    fetchRes.catch((e)=>{
      //恢复回调配置，尽量减小对入参原始对象的影响
      options.success = success;
      options.fail = fail;
      options.complete = complete;
      
      //回调
      let res = {
        errMsg: (e instanceof Error) ? e.message : 
                (e && e.errMsg) ? e.errMsg : 
                (typeof e ==="string") ? e : 
                'fail'
      };
      fail && fail(res);
      complete && complete(res);
    });

    //保留promise调用形式
    return fetchRes;
  }
}