/**
 * GBK字符串处理工具
 * @module handleStr
 */

/**
 * GBK长度计算函数
 * @param {string} str 源字符
 * @return {number} 字符串长度
 */
export function strLength(str) {
  if(!str) return 0
  var realLength = 0, len = str.length, charCode = -1;
  for (var i = 0; i < len; i++) {
    charCode = str.charCodeAt(i);
    if (charCode >= 0 && charCode <= 128) realLength += 1;
    else realLength += 2;
  }
  return realLength;
}

/**
 * GBK字符剪切函数
 * @param {string} str 源字符
 * @param {number} len 截取字符的GBK编码长度
 * @return {string} 截取的字符
 */
export function cutstr(str, len) {
  var str_length = 0;
  var str_len = 0;
  var str_cut = new String();
  str_len = str.length;
  for (var i = 0; i < str_len; i++) {
    let a = str.charAt(i);
    str_length++;
    if (escape(a).length > 4) {
      //中文字符的长度经编码之后大于4
      str_length++;
    }
    str_cut = str_cut.concat(a);
    if (str_length >= len) {
      // str_cut = str_cut.concat("...");
      return str_cut;
    }
  }
  //如果给定字符串小于指定长度，则返回源字符串；
  if (str_length < len) {
    return str;
  }
}

