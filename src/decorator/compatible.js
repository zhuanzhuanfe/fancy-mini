/**
 * 修饰器，实现各种兼容用法
 * @module
 */

/**
 * 提供微信api形式的回调
 * 主要适用场景：将微信api改写为promise形式后，兼容旧代码
 * 被修饰函数应该返回一个promise，成功时resolve，失败时reject，或返回{succeeded: true/false, ...}格式，通过succeeded字段标识成功失败
 * 修饰后的函数会支持arguments[0]中传入success、fail、complete属性，并根据promise结果进行回调
 * @param target
 * @param funcName
 * @param descriptor
 */
export function supportWXCallback(target, funcName, descriptor) {
  let oriFunc = descriptor.value;
  descriptor.value = function (...args) {
    //获取回调函数
    let {success, fail, complete} = args[0] || {};
    
    //获取执行结果
    let fetchRes = oriFunc.apply(this, args);

    //格式检查
    if (!(fetchRes instanceof Promise)) {
      console.error('[supportWXCallback] 被修饰函数返回结果应为Promise，函数：', funcName);
      return fetchRes;
    }

    //触发回调
    fetchRes.then((...results)=>{
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