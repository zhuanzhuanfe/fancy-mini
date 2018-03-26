/**
 * 避免并发调用修饰器模板
 * @param {Object} namespace 互斥函数间共享的一个全局变量，用于存储并发信息，多函数互斥时需提供；单函数自身免并发无需提供，以本地私有变量实现
 * @param {string} mutexStore 在namespace中占据一个变量名用于状态存储
 * @param {string} mutexId   互斥标识，具有相同标识的函数不会并发执行，缺省值：函数名
 * @param target
 * @param funcName
 * @param descriptor
 * @private
 */
function _noConcurrentTplt({namespace={}, mutexStore='_noConCurrentLocks', mutexId}, target, funcName, descriptor) {
  namespace[mutexStore] = namespace[mutexStore] || {};
  mutexId = mutexId || funcName;

  let oriFunc = descriptor.value;
  descriptor.value = function () {
    if (namespace[mutexStore][mutexId]) //上一次操作尚未结束，则无视本次调用
      return;

    namespace[mutexStore][mutexId] = true; //操作开始
    let res = oriFunc.apply(this, arguments);

    if (res instanceof Promise)
      res.then(()=> {
        namespace[mutexStore][mutexId] = false;
      }).catch((e)=> {
        namespace[mutexStore][mutexId] = false;
        console.error(funcName, e);
      }); //操作结束
    else {
      console.error('noConcurrent decorator shall be used with async function, yet got sync usage:', funcName);
      namespace[mutexStore][mutexId] = false;
    }

    return res;
  }
}

/**
 * 避免并发调用，在上一次操作结果返回之前，不响应重复操作
 * 如：用户连续多次点击同一个提交按钮，希望只响应一次，而不是同时提交多份表单
 * 使用示例：
 * import {noConcurrent} from '../../lib/decorators';
 * methods: {
 *    @noConcurrent     //避免并发，点击提交后，在接口返回之前无视后续点击
 *    async onSubmit(){
 *      let submitRes = await this.$httpWithLogin({...});
 *      //...
 *      return;
 *    }
 * }
 * 说明：
 *    同步函数由于js的单线程特性没有并发问题，无需使用此decorator
 *    异步时序，为便于区分操作结束时机，此decorator只支持修饰async函数/返回值为Promise的函数
 */
export const noConcurrent = _noConcurrentTplt.bind(null,{mutexStore:'_noConCurrentLocks'});

/**
 * 多函数互斥，具有相同互斥标识的函数不会并发执行
 * @param namespace 互斥函数间共享的一个全局变量，用于存储并发信息
 * @param mutexId   互斥标识，具有相同标识的函数不会并发执行
 * @return {*}
 *
 * 使用示例：
 * import {makeMutex} from '../../lib/decorators';
 * let globalStore = {};
 * class Navigator {
      @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
      static async navigateTo(route){...}

      @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
      static async redirectTo(route){...}
 * }
 */
export function makeMutex({namespace, mutexId}) {
  if (typeof namespace !== "object") {
    console.error('[makeNoConcurrent] bad parameters, namespace shall be a global object shared by all mutex funcs, got:', namespace);
    return function () {}
  }

  return _noConcurrentTplt.bind(null, {namespace, mutexStore:'_noConCurrentLocksNS', mutexId})
}
