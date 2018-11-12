/**
 * 免并发修饰器，在上一次操作结果返回之前，不响应重复操作
 * e.g.
 * 用户连续多次点击同一个提交按钮，希望只响应一次，而不是同时提交多份表单
 */
export const noConcurrent = makeNoConcurrent({mode: 'discard'});

/**
 * 步骤并合修饰器，避免公共步骤重复并发执行
 * 将公共步骤单例化：若步骤未在进行，则发起该步骤；若步骤正在进行，则监听并使用其执行结果，而不是重新发起该步骤
 * e.g.
 * 页面内同时发生如下三个请求： 登录-发送接口A、登录-发送接口B、登录-发送接口C
 * 未使用本修饰器时，网络时序：登录，登录，登录 - 接口A，接口B，接口C， 登录请求将会被发送三次
 * 使用本修饰器时，网络时序：登录 - 接口A，接口B，接口C，登录请求只会被发送一次
 */
export const mergingStep = makeNoConcurrent({mode: 'merge'});

/**
 * 单通道修饰器，使得并发调用逐个顺序执行
 * e.g.
 * 页面中多处同时调用弹窗函数
 * 未使用本修饰器时，执行时序：弹窗1、弹窗2、弹窗3同时展现，用户同时看到多个弹窗堆在一起and/or弹窗相互覆盖
 * 使用本修饰器时，执行时序：弹窗1展现、等待交互、用户关闭 => 弹窗2展现、等待交互、用户关闭 => 弹窗3展现、等待交互、用户关闭，弹窗函数依次顺序执行
 */
export const singleAisle  = makeNoConcurrent({mode: 'wait'});

/**
 * 免并发修饰器模板
 * @param {string} mode 互斥模式：
 *     discard - 丢弃模式，无视后续并发操作，场景示例：用户连续快速多次点击同一按钮，只执行一次监听函数，无视后续并发点击；
 *     merge - 合并模式，共享执行结果，场景示例：页面中多处同时触发登录过程，只执行一次登录流程，后续并发请求直接共享该次登录流程执行结果；
 *     wait - 等待模式，依次顺序执行，场景示例：页面中多处同时调用弹窗函数，一次只展示一个弹窗，用户关闭后再展示第二个，依次顺序展示
 *
 * 说明：
 *    同步函数由于js的单线程特性没有并发问题，无需使用此修饰器
 *    异步时序，为便于区分操作结束时机，此修饰器只支持修饰async函数/返回值为Promise的函数
 */
export function makeNoConcurrent({mode}) {
  return _noConcurrentTplt.bind(null, {mutexStore:'_noConCurrentLocks', mode});
}

/**
 * 多函数免并发，具有相同互斥标识的函数不会并发执行
 * @param {Object} namespace 互斥函数间共享的一个全局变量，用于存储并发信息
 * @param {string} mutexId   互斥标识，具有相同标识的函数不会并发执行
 * @param {string} mode 互斥模式：
 *     discard - 丢弃模式（默认），无视后续并发操作，场景示例：用户连续快速多次点击同一按钮，只执行一次监听函数，无视后续并发点击；
 *     merge - 合并模式，共享执行结果，场景示例：页面中多处同时触发登录过程，只执行一次登录流程，后续并发请求直接共享该次登录流程执行结果；
 *     wait - 等待模式，依次顺序执行，场景示例：页面中多处同时调用弹窗函数，一次只展示一个弹窗，用户关闭后再展示第二个，依次顺序展示
 *
 * 使用示例：
 * import {makeMutex} from 'fancy-mini/lib/decorators';
 * let globalStore = {};
 * class Navigator {
      @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
      static async navigateTo(route){...}

      @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
      static async navigateToMiniProgram(route){...}
 * }
 */
export function makeMutex({namespace, mutexId, mode}) {
  if (typeof namespace !== "object") {
    console.error('[makeNoConcurrent] bad parameters, namespace shall be a global object shared by all mutex funcs, got:', namespace);
    return function () {}
  }

  return _noConcurrentTplt.bind(null, {namespace, mutexStore:'_noConCurrentLocksNS', mutexId, mode});
}


/**
 * 免并发修饰器通用模板
 * @param {Object} namespace 互斥函数间共享的一个全局变量，用于存储并发信息，多函数互斥时需提供；单函数自身免并发无需提供，以本地私有变量实现
 * @param {string} mutexStore 在namespace中占据一个变量名用于状态存储
 * @param {string} mutexId   互斥标识，具有相同标识的函数不会并发执行，缺省值：函数名
 * @param {string} mode 互斥模式：
 *     discard - 丢弃模式（默认），无视后续并发操作，场景示例：用户连续快速多次点击同一按钮，只执行一次监听函数，无视后续并发点击；
 *     merge - 合并模式，共享执行结果，场景示例：页面中多处同时触发登录过程，只执行一次登录流程，各并发请求直接共享该次登录流程执行结果；
 *     wait - 等待模式，依次顺序执行，场景示例：页面中多处同时调用弹窗函数，一次只展示一个弹窗，用户关闭后再展示第二个，依次顺序展示
 * @param target
 * @param funcName
 * @param descriptor
 * @private
 */
function _noConcurrentTplt({namespace={}, mutexStore='_noConCurrentLocks', mutexId, mode='discard'}, target, funcName, descriptor) {
  namespace[mutexStore] = namespace[mutexStore] || {};
  mutexId = mutexId || funcName;

  namespace[mutexStore][mutexId] = namespace[mutexStore][mutexId] || {
    running: false, //是否有实例正在执行
    /**
     * 监听队列，当前函数实例执行完毕时调用
     * Array<Object>  {
     *    block: false,  //是否需要继续保持免并发状态
     *    handler: null, //处理函数，入参：刚结束的函数实例执行结果
     * }
     */
    listeners: [],
  };

  let oriFunc = descriptor.value;
  descriptor.value = async function () {
    let statusControl = namespace[mutexStore][mutexId];
    //免并发处理
    if (statusControl.running) { //上一次操作尚未结束
      switch (mode) {
        case 'discard': //丢弃模式，无视本次调用
          return;
        case 'merge':   //合并模式，直接使用上次操作结果作为本次调用结果返回
          let lastRes = await new Promise((resolve,reject)=>{
            statusControl.listeners.push({
              block: false, //无需继续免并发状态
              handler: resolve,
            });
          });
          return lastRes;
        case 'wait':    //等待模式，等待上次操作结束后再开始本次操作
          await new Promise((resolve,reject)=>{
            statusControl.listeners.push({
              block: true, //继续保持免并发状态
              handler: resolve,
            });
          });
          break;
        default:
          console.error('[_noConcurrentTplt] unknown mode:', mode);
          return;
      }
    }

    //释放并发锁处理
    let handleRunFinish = async function (res) {
      while (statusControl.listeners.length > 0){
        let listener = statusControl.listeners[0];
        statusControl.listeners = statusControl.listeners.slice(1);

        listener.handler(res);
        if (listener.block) //阻塞性监听，则继续保持免并发状态；本轮处理结束，后续监听处理及互斥锁释放过程由监听函数接管
          return;
        //否则继续进行后续监听处理
      }

      statusControl.running = false; //监听函数全部处理完毕，则释放并发锁
      return;
    };

    //操作开始
    statusControl.running = true;
    let res = oriFunc.apply(this, arguments);

    if (res instanceof Promise)
      res.then(()=>{
        handleRunFinish(res);
      }).catch((e)=> {
        console.error(funcName, e);
        handleRunFinish(res);
      });
    else {
      console.error('noConcurrent decorator shall be used with async function, yet got sync usage:', funcName);
      handleRunFinish(res);
    }

    return res;
  }
}
