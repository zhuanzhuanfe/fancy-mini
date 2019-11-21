/**
 * wepy框架工具集，与框架耦合的内容在此处实现
 * @module
 */

import wepy from 'wepy';

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
    wepy.component.prototype[prop] = propMap[prop]==='*this' ? lib : lib[propMap[prop]];
}

/**
 * 注册全局页面钩子
 * 注：页面中若有自定义同名钩子，则全局钩子会被覆盖，需要手动触发，如： 页面有自定义onUnload时需在onUnload中调用 super.onUnload && super.onUnload();
 * @param {string} hook 页面生命周期钩子名称
 * @param {Function} handler  处理函数
 */
export function registerPageHook(hook, handler) {
  if (typeof handler !== "function") {
    console.error('[registerPageHook] bad params:', hook, handler);
    return;
  }

  let oriHook = wepy.page.prototype[hook];
  wepy.page.prototype[hook] = function () {
    oriHook && oriHook.apply(this, arguments);
    handler.apply(this, arguments);
  };
}

/**
 * 页面数据恢复函数，用于
 * 1. wepy实例覆盖问题，存在两级同路由页面时，前者数据会被后者覆盖，返回时需予以恢复，详见bug：[两级页面为同一路由时，后者数据覆盖前者](https://github.com/Tencent/wepy/issues/322)
 * 2. 无限层级路由策略中，层级过深时，新开页面会替换前一页面，导致前一页面数据丢失，返回时需予以恢复
 *
 * @param {History~Route} route 页面路由对象
 * @param {string} context  数据丢失场景： tainted - 实例覆盖问题导致的数据丢失 | unloaded - 层级问题导致的数据丢失
 * @return {{succeeded: boolean}} 处理结果，格式形如：{succeeded: true}
 */
export function pageRestoreHandler({route, context}) {
  let path = route.url.split('?')[0];
  let wepyPage = wepy.$instance.$pages[path];
  dataRestoreWx2Wepy(wepyPage, route.wxPage.data);

  return {succeeded: true};
}

/**
 * 从原生页面数据中恢复wepy页面/组件实例数据
 * @ignore
 * @param {object} compThis wepy页面/组件根实例
 * @param {object} data  原生页面数据
 * @param {string} compPrefix  根实例数据在原生页面数据中的前缀，如： ''(页面实例）、'$PageFrame$'(页面下的PageFrame组件）、'$PageFrame$BackHome$'（PageFrame组件下的BackHome组件）
 * @return void 会将根实例及其所有后代组件实例 数据恢复为与原生页面数据保持一致的状态
 */
function dataRestoreWx2Wepy(compThis, data, compPrefix='') {
  //恢复组件自身的数据
  let selfData = {};
  for (let prop in data) {
    if (prop.startsWith(compPrefix) && !prop.substring(compPrefix.length).includes('$'))
      selfData[prop.substring(compPrefix.length)] = data[prop];
  }

  Object.assign(compThis, selfData);
  compThis.$apply();

  //恢复后代组件的数据
  for (let childName in compThis.$com) {
    dataRestoreWx2Wepy(compThis.$com[childName], data, (compPrefix || '$')+childName+'$');
  }
}

/**
 * wepy提供的路由模块，格式与wx路由模块一致，额外做了些优化处理，如：支持prefetch
 */
export const NavRefine = {
  navigateTo(options){
    getCurWepyPage().$navigate(options);
  },
  redirectTo(options){
    getCurWepyPage().$redirect(options);
  }
}

/**
 * 获取当前页面对应的wepy实例
 * @return wepyPage
 */
export function getCurWepyPage() {
  let curPages = getCurrentPages();
  let curPage = curPages[curPages.length-1];
  let curPath = '/' + (curPage.route || curPage.__route__);
  return wepy.$instance.$pages[curPath];
}