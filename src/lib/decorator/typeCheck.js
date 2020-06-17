/**
 * 检测工具
 */
const _toString = Object.prototype.toString;
// 检测是否为纯粹的对象
const _isPlainObject = function  (obj) {
  return _toString.call(obj) === '[object Object]'
}
// 检测是否为正则
const _isRegExp = function  (v) {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * @description 类型检测函数
 *  用于检测类型action
 * @param {Array} checked 被检测数组
 * @param {Array} checker 检测数组
 * @return {Boolean} 是否通过检测
 */
const _check = function (checked,checker) {
  check:
    for(let i = 0; i < checked.length; i++) {
      if(/(any)/ig.test(checker[i]))
        continue check;
      if(_isPlainObject(checked[i]) && /(object)/ig.test(checker[i]))
        continue check;
      if(_isRegExp(checked[i]) && /(regexp)/ig.test(checker[i]))
        continue check;
      if(Array.isArray(checked[i]) && /(array)/ig.test(checker[i]))
        continue check;
      let type = typeof checked[i];
      let checkReg = new RegExp(type,'ig')
      if(!checkReg.test(checker[i])) {
        console.error(checked[i] + 'is not a ' + checker[i]);
        return false;
      }
    }
  return true;
}
/**
 * @description 检测类型
 *   1.用于校检函数参数的类型，如果类型错误，会打印错误并不再执行该函数；
 *   2.类型检测忽略大小写，如string和String都可以识别为字符串类型；
 *   3.增加any类型，表示任何类型均可检测通过；
 *   4.可检测多个类型，如 "number array",两者均可检测通过。正则检测忽略连接符；
 * @param {...string} args
 */
export function typeCheck() {
  const checker =  Array.prototype.slice.apply(arguments);
  return function (target, funcName, descriptor) {
    let oriFunc = descriptor.value;
    descriptor.value =  function () {
      let checked =  Array.prototype.slice.apply(arguments);
      let result = undefined;
      if(_check(checked,checker)){
        result = oriFunc.call(this,...arguments);
      }
      return result;
    }
  }
};
