import wepy from 'wepy';

/**
 * 注册全局属性
 * @param {Object|string} lib/name
 * @param {Object|*} propMap/value
 e.g.
 installGlobalProps(wx, {'$navigate': navigate});
 则所有页面&组件可以以 this.$navigate 的形式调用 wx.navigate
 */
export function installGlobalProps(lib, propMap=lib.installProps) {
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