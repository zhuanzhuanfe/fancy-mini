/**
 * 封装常用的通用功能函数
 * @module operationKit
 */

/**
 * 深度拷贝
 * @param {*} source 源参数
 * @return {*}   源参数的深度拷贝
 */
export function deepClone(source){
  if (!isNonNullObject(source))
    return source;

  var clone = Array.isArray(source) ? [] : {};
  for (var p in source)
    clone[p] = deepClone(source[p]);

  return clone;
}

/**
 * 深度判等
 * 两个对象结构和数据完全一致，即认为相等，而不要求是同一引用
 * @param {*} o1  参数1
 * @param {*} o2  参数2
 * @return {boolean}  参数1、参数2 是否相等
 */
export function deepEqual(o1, o2) {
  if (!( isNonNullObject(o1) && isNonNullObject(o2) ))
    return o1 === o2;
  
  for (var p in o1) {
    if (!deepEqual(o1[p], o2[p]))
      return false;
  }

  for (var q in o2) {
    if (!(q in o1))
      return false;
  }

  return true;
}

/**
 * 深度覆盖
 * 将源对象的值覆盖目标对象，相同结构相同参数部分直接覆盖，其它部分保持不变
 * @param {object} target 目标对象
 * @param {...object} sources  若干个源对象
 *
 * @example
 * 修改前：
 *    target = {x: 1, y: {a: 1, b:1 }, z: 1};
 *    source = {x: 2, y: {a: 2}};
 *
 * 修改后：
 *    target = {x: 2, y: {a: 2, b:1 }, z: 1}
 */
export function deepAssign(target, ...sources) {
  if (!isNonNullObject(target)) {
    console.error('[deepAssign] bad parameters, target should be an object, parameters:', arguments);
    return target;
  }

  for (let source of sources) {
    if (source === null || source === undefined)
      continue;
    if (typeof source !== "object") {
      console.warn('[deepAssign] bad parameters, source should all be object, parameters:', arguments);
      continue;
    }

    for (var p in source) {
      if (isNonNullObject(target[p]) && typeof source[p] === "object")
        deepAssign(target[p], source[p]);
      else
        target[p] = source[p];
    }
  }

  return target;
}

/**
 * 覆盖目标字段，剔除多余字段
 * 将源对象的值覆盖目标对象，相同结构相同参数部分直接覆盖，其它部分予以剔除
 * @param {object} target 目标对象
 * @param {...object} sources 若干个源对象
 * 
 * @example
    //模块中指定的可配项列表及其默认值
    const defaultOptions = {
      x: 1,
      y: {a: 1, b: 1}
    };

    //调用方传入的自定义配置
    let customOptions = {
      y: {a: 2}, //可能只指定了部分配置
      zz: 2, //可能还含有一堆杂七杂八的属性
      zzz: 2,
    };

    //初始配置（target为空对象时，取source[0]作为蓝本，只保留sources[0]中的属性）
    let options = peerAssign({}, defaultOptions, customOptions);
    console.log('options:', options); //{x: 1, y: {a:2, b:1}} 所需属性予以覆盖，多余属性予以剔除
    
    //增量配置（target不为空时，取target作为蓝本，只保留target中的属性）
    peerAssign(options, {x:3, y: {b:3}, zz:3});
    console.log('options:', options); //{x: 3, y: {a:2, b:3}} 
 */
export function peerAssign(target, ...sources) {
  if (!isNonNullObject(target)) {
    console.error('[peerAssign] bad parameters, target should be an object, got:', target, 'sources:', ...sources);
    return target;
  }
  
  let blueprint = isNonEmptyObject(target) ? target : (sources[0] || {});
  
  for (let source of sources) {
    if (source === null || source === undefined)
      continue;
    if (typeof source !== "object") {
      console.warn('[peerAssign] bad parameters, source should all be object, parameters:', arguments);
      continue;
    }

    for (let p in blueprint) {
      if (!(p in source))
        continue;
      
      if (isNonEmptyObject(blueprint[p])) { //蓝本中为非空对象，只保留蓝本中指定的字段
        target[p] = target[p] || {};
        peerAssign(target[p], source[p]);
      } else if (isNonNullObject(blueprint[p])) { //蓝本中为空对象，接受任意字段
        target[p] = target[p] || {};
        deepAssign(target[p], source[p]);
      } else { //其它情况，直接覆盖
        target[p] = source[p];
      }
    }
  }

  return target;
}

/**
 * 判断一个变量是否为非null对象
 * @param {*} item
 * @return {boolean}
 */
export function isNonNullObject(item) {
  return typeof item === "object" && item !== null;
}

/**
 * 判断一个变量是否为非空对象
 * @param {*} item
 * @return {boolean}
 */
export function isNonEmptyObject(item) {
  return isNonNullObject(item) && Object.getOwnPropertyNames(item).length>0;
}

/**
 * 设置延时
 * @param {number} ms  延迟时长，单位：ms
 * @return {Promise}
 * @example
 * async function demo(){
 *   console.log('enter demo, timestamp:', Date.now());
 *   await delay(2000); //延迟2s再执行后续代码
 *   console.log('continue demo, timestamp:', Date.now());
 * }
 */
export function delay(ms) {
  return new Promise((resolve, reject)=>{
    setTimeout(resolve, ms);
  });
}

/**
 * 版本号比较
 * @param {string} v1 版本号1，形如"2.2.3"
 * @param {string} v2 版本号2
 * @return {number} 比较结果： -1 小于 | 0 等于 | 1 大于
 */
export function compareVersion(v1, v2) {
  var seq1 = v1.split(".").map(subVersion=>parseInt(subVersion));
  var seq2 = v2.split(".").map(subVersion=>parseInt(subVersion));

  var len1 = seq1.length, len2 = seq2.length, commonLen = Math.min(len1, len2);
  for (var i=0; i<commonLen; ++i) {
    if (seq1[i] != seq2[i])
      return seq1[i]<seq2[i] ? -1 : 1;
  }

  return len1==len2 ? 0 : (len1<len2 ? -1 : 1);
}

/**
 * 拼接参数，注：当前只针对小程序标准url，暂未考虑含#号/多?号等特殊url情形
 * @param {string} url 原url
 * @param {Object.<string, string>} extraParams 新增参数/覆盖已有参数，key为参数名，value为参数值
 * @return {string} 新url
 */
export function appendUrlParam(url, extraParams) {
  if (!extraParams)
    return url;

  let [path, queryStr=""] = url.split('?');
  let params = {};
  queryStr.split('&').forEach(paramStr=>{
    let [name, value] = paramStr.split('=');
    if (name && value!==undefined)
      params[name] = value;
  });

  let newParams = Object.assign({}, params, extraParams);
  let newQueries = [];
  for (let name in newParams)
    newQueries.push(name + '=' + newParams[name]);

  return newQueries.length>0 ? path + '?' + newQueries.join('&') : url;
}

/**
 * 将小程序相对路径转为绝对路径
 * @param {string} relativePath 相对路径
 * @param {string} curPath  当前路径
 * @return {string} 绝对路径
 */
export function toAbsolutePath(relativePath, curPath) {
  if (!(typeof relativePath === 'string' && typeof curPath === 'string') ) {
    console.error('[toAbsolutePath] bad params, relativePath:', relativePath, 'curPath:', curPath);
    return relativePath;
  }

  if (relativePath[0] === '/') //已经是绝对路径
    return relativePath;

  let levels = curPath.split('/').slice(0,-1).concat(relativePath.split('/'));
  let absoluteLevels = [];
  for (let level of levels) {
    if (level === '' || level==='.')
      continue;
    if (level === '..'){
      absoluteLevels.pop();
      continue;
    }
    absoluteLevels.push(level);
  }
  return '/'+absoluteLevels.join('/');
}

/**
 * 剩余时间的语义化表示
 * @param {number} remainMs 剩余时间，单位：毫秒
 * @param {number} remainderInterval 最小时间间隔，不足1秒的部分以此计数
 * @param {string} topLevel 顶层间隔：day|hour|minute|second， 如顶层间隔为'hour'，则返回结果为形如 27小时3分钟 而不是 1天3小时3分钟
 * @return {{days: number, hours: number, minutes: number, seconds: number, remainderIntervals: number}} 格式形如：{days: number, hours: number, minutes: number, seconds: number, remainderIntervals: number}，表示 剩余days天hours小时minutes分钟seconds秒remainderIntervals间隔
 */
export function semanticRemainTime({remainMs, topLevel='day', remainderInterval=1000}) {
  const SCALES = {
    second: 1000,
    minute: 60*1000,
    hour: 60*60*1000,
    day: 24*60*60*1000,
  };

  let topScale = SCALES[topLevel];

  let [days, hours, minutes, seconds, remainderIntervals] = [
    SCALES.day, SCALES.hour, SCALES.minute, SCALES.second, remainderInterval
  ].map((scale, idx, arr)=>{
    return (scale>=topScale || idx===0) ? remainMs/scale : remainMs%arr[idx-1]/scale
  }).map(Math.floor);

  return {
    days, hours, minutes, seconds, remainderIntervals
  }
}

/**
 * 若字符串长度小于指定长度，则在前方拼接指定字符
 * es6中string的padStart函数目前存在兼容性问题，暂以此替代
 * @param {string|number} str 字符串
 * @param {number} minLen 指定长度
 * @param {string|number} leadChar 指定字符
 * @return {string} 新字符串
 * @example
 * let num = 1;
 * padStart(num, 2, '0'); //'01'
 */
export function padStart(str, minLen, leadChar) {
  str = String(str);
  while (str.length < minLen)
    str = leadChar+str;
  return str;
}

/**
 * 查询元素在页面中的坐标，单位：px
 * @async
 * @param {string} selector 元素选择器
 * @param [thisComp=null] 微信自定义组件this对象,目标元素在自定义组件中时需提供
 * @return {object} 元素坐标，格式同[boundingClientRect返回值]{@link https://developers.weixin.qq.com/miniprogram/dev/api/wxml/NodesRef.boundingClientRect.html}
 */
export async function queryRect(selector, {thisComp=null}={}){
  return new Promise((resolve, reject)=>{
    (thisComp||wx).createSelectorQuery().select(selector).boundingClientRect(resolve).exec();
  });
}

/**
 * 将内联样式字符串解析为对象形式
 * @param {string} styleStr 内联样式，e.g. 'color: red; transform: translate(20px, 30px)'
 * @return {Object} 内联样式对象，e.g. {color:"red",transform:"translate(20px, 30px)"}
 */
export function parseInlineStyle(styleStr) {
  if (!styleStr)
    return {};

  let styleObj = {};

  let declarations = styleStr.split(';');
  for (let declaration of declarations) {
    let [prop, value] = declaration.split(':').map(part=>part.replace(/^\s*|\s*$/g, ''));
    styleObj[prop] = value;
  }

  return styleObj;
}
/**
 * 将样式对象转为内联样式字符串
 * @param {Object} styleObj 内联样式对象，e.g. {color:"red",transform:"translate(20px, 30px)"}
 * @return {string} 内联样式，e.g. 'color: red; transform: translate(20px, 30px)'
 */
export function toInlineStyle(styleObj) {
  let declarations = [];
  for (let prop in styleObj)
    declarations.push(`${prop}:${styleObj[prop]}`);
  return declarations.join('; ');
}

/**
 * 将实例方法封装为通用函数，使之可以在任何this对象上执行
 * 类似于原生语法中的bind函数，会保证方法被执行时this始终为指定的this对象，
 * 会额外记录实际触发源的this对象，并以参数的形式传给方法
 * @param {object} instance 实例对象
 * @param {string} method 方法名
 * @param {object|boolean} [rcvThis] 触发源this保存配置
 * @param {number} [rcvThis.argIdx=0] 将触发源this保存到下标为argIdx的参数的argProp属性上
 * @param {string} [rcvThis.argProp='thisIssuer'] 将触发源this保存到下标为argIdx的参数的argProp属性上
 * @example
 * //日志管理器
 * class Logger {
 *   commonInfo = { //所有日志都会携带的公共信息，如机型、版本号等
 *     loggerVersion: '1.0.0'
 *   };
 *   //上报日志
 *   log(options){
 *     //函数执行时，this对象要始终保持为Logger对象，会需要访问this.commonInfo等内容
 *     console.log('[log]', 'customInfo:', options, 'commonInfo:', this.commonInfo);
 *     
 *     //通过options.thisIssuer参数传入触发日志上报的组件的this对象
 *     let trigger = options.thisIssuer;
 *     let triggerInfo = ...; //获取触发源信息，如组件级公共参数等
 *   }
 * }
 * 
 * let logger = new Logger();
 * let log = makeAssignableMethod({ //将logger.log封装为通用的log函数
 *   instance: logger,
 *   method: 'log',
 *   rcvThis: {
 *     argIdx: 0,
 *      argProp: 'thisIssuer'
 *   }
 * });
 * 
 * class Component {
 *   log, //该通用log函数可以在任何地方使用，也可以注册到其它类上
 *   test(){
 *     this.log({action: 'test'}); //相当于：logger.log({action:'test', 'thisIssuer': this})
 *   }
 * }
 */
export function makeAssignableMethod({instance, method, rcvThis}) {
  //无需记录触发源this对象，直接绑定this，返回
  if (!rcvThis)
    return instance[method].bind(instance);
  
  //参数处理
  const defaultRcv = {
    argIdx: 0,
    argProp: 'thisIssuer'
  };
  
  rcvThis = typeof rcvThis === "object" ? rcvThis : {};
  rcvThis = Object.assign({}, defaultRcv, rcvThis);
  
  //封装函数
  return function (...args) {
    //记录触发源this对象
    args[rcvThis.argIdx] = args[rcvThis.argIdx] || {};
    args[rcvThis.argIdx][rcvThis.argProp] = args[rcvThis.argIdx][rcvThis.argProp] || this;
    
    //将this重置为指定实例
    return instance[method].apply(instance, args);
  }
}

/**
 * 将多个函数组合成一个新函数
 * 调用新函数 等价于 依次调用各个源函数
 * @param {Array<Function>} funcs 函数列表
 * @return {Function} 新函数
 */
export function combineFuncs({funcs}) {
  funcs = funcs.filter(func=>typeof func === "function");
  
  return function (...args) {
    for (let func of funcs) {
      try {
        func.apply(this, args);
      } catch (e) {
        console.error(e);
      }
    }
  }
}