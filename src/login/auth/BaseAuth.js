export default class BaseAuth {
  /**
   * 静默登录
   * 可以在用户无感知的情况下后台悄悄完成的登录过程
   * @param {Object} loginOptions 登录函数调用参数
   * @param {Object} configOptions 登录模块配置参数
   * @return {Promise<{succeeded: boolean, errMsg: string, userInfo: {}, expireTime: number, anonymousInfo: {}}>}
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
   * @param {Object} loginOptions  登录函数调用参数
   * @param {Object} configOptions 登录模块配置参数
   * @return {Promise<*>} 需要传递给authLogin的数据
   */
  beforeAuthLogin({loginOptions, configOptions}){};

  /**
   * 授权登录
   * 需要用户配合点击授权按钮/输入表单等才能完成的登录过程
   * @param {Object} loginOptions 登录函数调用参数
   * @param {Object} configOptions 登录模块配置参数
   * @param {*} [beforeRes] beforeAuthLogin钩子执行结果
   * @param {Object} authData 登录界面交互结果
   * @return {Promise<{succeeded: boolean, errMsg: string, userInfo: {}, expireTime: number, anonymousInfo: {}}>}
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