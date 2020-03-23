/**
 * uni-app框架工具集，与uni-app框架耦合的内容在此处实现
 * @module uniAppKit
 */

import Vue from 'vue';

/**
 * 注册全局this属性
 * @param {Object|string} lib|name
 * @param {Object|*} propMap|value
 @example
 //通过键值对的方式一次注册一个属性
 registerToThis('$navigateTo', wx.navigateTo);
 registerToThis('$redirectTo', wx.redirectTo);
 //则所有页面&组件可以以 this.$navigateTo 的形式调用 wx.navigateTo

 //通过 库-映射表 的方式一次注册多个属性
 registerToThis(wx, {
   '$navigateTo': 'navigateTo', 
   '$redirectTo': 'redirectTo'
 });
 //则所有页面&组件可以以 this.$navigateTo 的形式调用 wx.navigateTo
 */
export function registerToThis(lib, propMap) {
  if (typeof lib === "string") {
    let [name, value] = [lib, propMap];
    lib = {
      [name]: value
    };
    propMap = {
      [name]: name
    };
  }

  if (!((typeof lib==="object"||typeof lib==="function") && typeof propMap==="object")) {
    console.error('[registerToThis failed] bad params:', arguments);
    return;
  }

  for (let prop in propMap)
    Vue.prototype[prop] = propMap[prop]==='*this' ? lib : lib[propMap[prop]];
}

/**
 * 注册全局页面钩子
 * @param {string} hook 页面生命周期钩子名称
 * @param {Function} handler  处理函数
 */
export function registerPageHook(hook, handler) {
  if (typeof handler !== "function") {
    console.error('[registerPageHook] bad params:', hook, handler);
    return;
  }

  Vue.mixin({
    [hook]: function (...args) {
      if (this.mpType !== 'page') //非页面顶级组件，不作处理
        return;

      handler.apply(this, args);
    }
  });
}

/**
 * 获取当前页面对应的uni-app框架实例
 * @return uniPage
 */
export function getCurUniPage() {
  let curPages = getCurrentPages();
  let curPage = curPages[curPages.length-1];
  return curPage && curPage.$vm;
}

/**
 * 页面数据恢复函数，用于
 * 1. [无关]wepy实例覆盖问题，存在两级同路由页面时，前者数据会被后者覆盖，返回时需予以恢复，详见bug：[两级页面为同一路由时，后者数据覆盖前者](https://github.com/Tencent/wepy/issues/322)
 * 2. 无限层级路由策略中，层级过深时，新开页面会替换前一页面，导致前一页面数据丢失，返回时需予以恢复
 * 
 * @param {History~Route} route 页面路由对象
 * @param {string} context  数据丢失场景： tainted - 实例覆盖问题导致的数据丢失 | unloaded - 层级问题导致的数据丢失
 * @return {{succeeded: boolean}} 处理结果，格式形如：{succeeded: true}
 */
export function pageRestoreHandler({route, context}) {
  if (context === 'tainted') //uni-app框架不存在实例覆盖问题,无需处理
    return {succeeded: true};
  
  //恢复页面数据  
  restoreVmTree({
    targetVm: getCurUniPage(),
    sourceVm: route.wxPage.$vm,
  });
  return {succeeded: true};
}

/**
 * 恢复组件树中各组件的数据
 * @ignore
 * @param {VueComponent} targetVm 待恢复的组件树根实例
 * @param {VueComponent} sourceVm 作为数据源的组件树根实例 
 */
function restoreVmTree({targetVm, sourceVm}){
  //恢复根实例自身数据
  Object.assign(targetVm, sourceVm.$data);
  
  //恢复各子组件及其后代组件的数据
  for (let i=0; i<targetVm.$children.length; ++i)
    restoreVmTree({targetVm: targetVm.$children[i], sourceVm: sourceVm.$children[i]});
}