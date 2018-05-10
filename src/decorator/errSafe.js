/**
 * 捕获async函数中的异常，并进行错误提示
 * 函数正常结束时应 return 'ok'，return其它文案时将toast指定文案，无返回值或产生异常时将toast默认文案
 * @param {string} defaultMsg  默认文案
 * @param {number, optional} duration 可选，toast持续时长
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
        console.error('caught err with func:',funcName, e);
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
 */
export function errSafe(target, funcName, descriptor) {
  let oriFunc = descriptor.value;
  descriptor.value = function () {
    try {
      return oriFunc.apply(this, arguments);
    } catch (e) {
      console.error('[errSafe decorator] caught err with func:',funcName, e);
    }
  }
}
