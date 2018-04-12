import wepy from 'wepy';

/**
 * 注册全局this属性
 * @param {Object|string} lib|name
 * @param {Object|*} propMap|value
 e.g.
 registerToThis('$navigateTo', wx.navigateTo);
 registerToThis('$redirectTo', wx.redirectTo);

 registerToThis(wx, {'$navigateTo': 'navigateTo', '$redirectTo': 'redirectTo'});

 则所有页面&组件可以以 this.$navigateTo 的形式调用 wx.navigateTo
 */
export function registerToThis(lib, propMap=lib.installProps) {
  if (typeof lib === "string") {
    let [name, value] = [lib, propMap];
    lib = {
      [name]: value
    };
    propMap = {
      [name]: name
    };
  }

  if (!(typeof lib==="object" && typeof propMap==="object")) {
    console.error('[installGlobalProps failed] bad params:', arguments);
    return;
  }

  for (let prop in propMap)
    wepy.component.prototype[prop] = lib[propMap[prop]];
}

/**
 * 注册全局页面钩子
 * @param {string} hook 页面生命周期钩子名称
 * @param {Function} handler  处理函数
 *
 * 注：页面中若有自定义同名钩子，则全局钩子会被覆盖，需要手动触发，如： 页面有自定义onUnload时需在onUnload中调用 super.onUnload && super.onUnload();
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