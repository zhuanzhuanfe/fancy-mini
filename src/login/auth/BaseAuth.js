/**
 * @typedef {Object} BaseAuth~LoginRes 鉴权模块登录结果
 * @property {boolean} succeeded 是否成功
 * @property {string} errMsg 详细错误信息，调试用
 * @property {string} [toastMsg] 错误信息话术，向用户提示用
 * @property {Object} userInfo （成功时）用户信息
 * @property {number} expireTime （成功时）过期时间，绝对毫秒数，-1表示长期有效
 * @property {Object} [anonymousInfo] （不管成功失败）匿名信息，登录成功前使用的临时标识，成功后继续关联
 */

/**
 * 鉴权模块基类
 * 负责根据用户提供的信息，完成校验过程，并返回对应的登录数据
 */
class BaseAuth {
  /**
   * 静默登录
   * 可以在用户无感知的情况下后台悄悄完成的登录过程
   * @async
   * @param {Object} loginOptions 登录函数调用参数，参见{@link BaseLogin#login}
   * @param {Object} configOptions 登录模块配置参数，参见{@link BaseLogin#config}
   * @return {BaseAuth~LoginRes}
   */
  silentLogin({loginOptions, configOptions}){
    return {
      succeeded: false, //是否成功
      errMsg: '该授权方式未实现静默登录', //详细错误信息，调试用
      toastMsg: '该授权方式未实现静默登录', //（若有）错误信息话术，展示给用户
      userInfo: {}, //（成功时）用户信息
      expireTime: -1, //（成功时）过期时间，绝对毫秒数，-1表示长期有效
      anonymousInfo: null, //（不管成功失败）匿名信息，登录成功前使用的临时标识，成功后继续关联
    }
  }

  /**
   * 进行授权登录之前的准备工作
   * 时序：beforeAuthLogin -> 用户交互，同意授权 -> authLogin
   * @async
   * @param {Object} loginOptions  登录函数调用参数，参见{@link BaseLogin#login}
   * @param {Object} configOptions 登录模块配置参数，参见{@link BaseLogin#config}
   * @return {*} 需要传递给authLogin的数据
   */
  beforeAuthLogin({loginOptions, configOptions}){};

  /**
   * 授权登录
   * 需要用户配合点击授权按钮/输入表单等才能完成的登录过程
   * @async
   * @param {Object} loginOptions 登录函数调用参数，参见{@link BaseLogin#login}
   * @param {Object} configOptions 登录模块配置参数，参见{@link BaseLogin#config}
   * @param {*} [beforeRes] beforeAuthLogin钩子执行结果
   * @param {Object} authData 登录界面交互结果
   * @return {BaseAuth~LoginRes}
   */
  authLogin({loginOptions, configOptions, beforeRes, authData}){
    return {
      succeeded: false, //是否成功
      errMsg: '该授权方式未实现授权登录', //详细错误信息，调试用
      toastMsg: '该授权方式未实现授权登录', //（若有）错误信息话术，展示给用户
      userInfo: {}, //（成功时）用户信息
      expireTime: -1, //（成功时）过期时间，绝对毫秒数，-1表示长期有效
      anonymousInfo: null, //（不管成功失败）匿名信息，登录成功前使用的临时标识，成功后继续关联
    }
  }
}

export default BaseAuth;