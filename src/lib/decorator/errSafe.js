/**
 * 修饰器，实现各种错误处理
 * @module errSafe
 */

/**
 * 捕获async函数中的异常，并进行错误提示
 * 函数正常结束时应 return 'ok'，return其它文案时将toast指定文案，无返回值或产生异常时将toast默认文案
 * @param {string} defaultMsg  默认文案
 * @param {number} [duration] 可选，toast持续时长
 * 
 * @example
 * class Demo {
 *   //领取奖励
 *   \@withErrToast({defaultMsg: '服务异常'}) //领取过程出现异常时，自动捕获异常并toast提示“服务异常”，避免交互无响应
 *   async acquireReward(){
 *     //各种处理....
 *     // return acquireRes.errMsg; //使用接口返回的异常信息作为提示文案
 *     
 *     return 'ok'; //标示函数正常结束
 *   }
 * }
 */
export function withErrToast({defaultMsg, duration=2000}) {
  return function (target, funcName, descriptor) {
    let oriFunc = descriptor.value;
    descriptor.value = async function () {
      let errMsg = '';
      let res = '';
      try {
        res = await oriFunc.apply(this, arguments);
        if (res != 'ok')
          errMsg = typeof res === 'string' && !/^\s*$/.test(res) ? res : defaultMsg;
      } catch (e) {
        errMsg = defaultMsg;
        console.error('caught err with func:',funcName, e.message, e);//真机下不支持打印错误栈，导致e打印出来是个空对象；故先单独打印一次e.message
      }

      if (errMsg) {
        this.$toast({
          title: errMsg,
          type: 'fail',
          duration: duration,
        });
      }
      return res;
    }
  }
}

/**
 * 捕获函数异常，避免阻断主流程
 * 支持同步函数和async函数
 * @example
 * class Demo {
 *   //解析banner数据
 *   \@errSafe //若解析过程出现异常，予以捕获，避免局部数据异常导致整个页面白屏
 *   parseDataBanner(){
 *   
 *   }
 * }
 */
export function errSafe(target, funcName, descriptor) {
  let oriFunc = descriptor.value;
  descriptor.value = function () {
    try {
      let res = oriFunc.apply(this, arguments);

      if (res instanceof Promise) {
        res.catch((e)=>{
          console.error('[errSafe decorator] caught err with func:',funcName, e.message, e);
        });
      }

      return res;
    } catch (e) {
      console.error('[errSafe decorator] caught err with func:',funcName, e.message, e); //真机下不支持打印错误栈，导致e打印出来是个空对象；故先单独打印一次e.message
    }
  }
}
