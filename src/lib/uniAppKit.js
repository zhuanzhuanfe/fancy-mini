/**
 * uni-app框架工具集，与uni-app框架耦合的内容在此处实现
 * @module
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