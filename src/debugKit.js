const debug = false; //调试开关， todo:根据运行模式/其它条件自动判断是否开启调试

/**
 * 上下文相关的控制台：开启调试模式时，功能同系统console；关闭调试模式时，忽略所有console调用。调试模式开关由本模块自动获取/统一指定，对调用方透明。
 * 使用示例：
 * import {ctxDependConsole as console} from '../../lib/debugKit'
 * console.log('ha ha ha');   //开启调试模式时，打印'ha ha ha'；关闭调试模式时，自动无视此行代码
 */
export const ctxDependConsole = (function () {
  let ctxDependConsole = {};
  for (let p in console) {
    if (typeof console[p] !== "function") {
      ctxDependConsole[p] = console[p];
      continue;
    }
    ctxDependConsole[p] = debug ? console[p] : function () {};
  }
  return ctxDependConsole;
})();
