/**
 * 步骤并合修饰器，避免公共步骤并发进行
 * e.g.
 * 页面内同时发生如下三个请求： 登录-发送接口A、登录-发送接口B、登录-发送接口C
 * 未使用本修饰器时，网络时序：登录，登录，登录 - 接口A，接口B，接口C， 登录请求将会被发送三次
 * 使用本修饰器时，网络时序：登录 - 接口A，接口B，接口C，登录请求只会被发送一次
 *
 * 将公共步骤单例化：若步骤未在进行，则发起该步骤；若步骤正在进行，则监听并使用其执行结果，而不是重新发起该步骤
 */
export function mergingStep(target, name, descriptor) {
  let oriFunc = descriptor.value;
  let runningInstance = null;

  descriptor.value = function (...args) {
    if (runningInstance) //若步骤正在进行，则监听并使用其执行结果，而不是重新发起该步骤
      return runningInstance;

    let res = oriFunc.apply(this, args);

    if (!(res instanceof Promise))
      return res;

    runningInstance = res;
    runningInstance.then(function () {
      runningInstance = null;
    }).catch(function () {
      runningInstance = null;
    });
    return runningInstance;
  }
}
