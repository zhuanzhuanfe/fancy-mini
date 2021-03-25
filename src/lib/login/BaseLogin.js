import { deepClone, makeAssignableMethod, peerAssign, combineFuncs } from '../operationKit';
import { mergingStep, errSafe } from '../decorators';

/**
 * 登录模块，详见{@tutorial 2.1-login}
 */
@requireConfig //确保调用API时已完成模块配置
class BaseLogin {
  //配置，格式参见config函数
  _configOptions = {};

  //数据（长期数据，会被存储到storage中）
  _loginInfo = {
    userInfo: {}, //用户信息
    isLogin: false, //是否已登录
    expireTime: -1, //过期时间，相对1970年的绝对毫秒数，-1表示长期有效
    authType: '', //使用的验证方式
    anonymousInfo: {}, //匿名信息（登录成功前使用的临时标识，成功后继续关联）
  };

  //状态（短期数据，仅本次会话使用）
  _stateInfo = {
    isConfigReady: false, //是否已完成模块配置
  };

  /**
   * 构造函数
   * @param {object} [configOptions] 配置项，参见{@link BaseLogin#config}
   */
  constructor(configOptions) {
    configOptions && this.config(configOptions);
  }

  /**
   * 模块配置
   * @param {Object} configOptions 
   * @param {String} [configOptions.loginInfoStorage] 登录相关信息存储到storage时使用的key
   * @param {Requester} configOptions.requester 请求管理器
   * @param {Function} [configOptions.onUserAuthFailed] 钩子函数，获取用户授权信息失败时触发
   * @param {Function} [configOptions.onUserAuthSucceeded] 钩子函数，获取用户授权信息成功时触发
   * @param {Function} [configOptions.onNewlyLogin] 钩子函数，刚刚登录成功时触发（未登录=>已登录）
   * @param {BaseLogin~OnLoginFailed} [configOptions.onLoginFailed] 钩子函数，登录失败时触发
   * @param {Object.<string, BaseAuth>} configOptions.authEngineMap 鉴权器映射表
        key为登录方式，value为对应的鉴权器
        e.g. {
          'wechat' : new WechatAuth(), //微信登录，WechatAuth应继承于BaseAuth
          'phone' : new PhoneAuth(), //手机号登录，PhoneAuth应继承于BaseAuth
        }
   * @param {String} configOptions.defaultAuthType 默认登录方式
   * @param {BaseLogin~UserAuthHandler} configOptions.userAuthHandler 授权交互处理函数，负责跟用户交互，收集鉴权所需信息
   * @param {BaseLogin~LoginStepAddOn} [configOptions.loginStepAddOn] 登录流程自定义附加步骤，会在正常登录流程执行成功时调用，并根据其处理结果生成最终登录结果
   * @param {Function} [configOptions.pageConfigHandler] 页面配置处理函数，负责获取当前页面的页面级登录配置，默认实现：
   * ```js
   *   function pageConfigHandler(){ 
   *     //获取当前页面实例
   *     let curPages = getCurrentPages(); 
   *     let curPage = curPages[curPages.length-1] || {};
   *     //获取当前页面的页面级登录配置
   *     return curPage.$loginOpts;
   *   }
   * ``` 
   */
  config(configOptions) {
    //参数校验
    const necessaryFields = ['userAuthHandler', 'authEngineMap', 'defaultAuthType', 'requester'];
    for (let field of necessaryFields) {
      if (configOptions[field] === undefined) {
        console.error('[Login] config, 必填参数缺失：', field);
        return;
      }
    }

    //参数处理
    const defaultOpts = {
      loginInfoStorage: '__loginInfo',

      requester: null,

      onUserAuthFailed: null,
      onUserAuthSucceeded: null,
      onNewlyLogin: null,
      onLoginFailed(res, { failAction }) {
        switch (failAction) { //调用方希望的失败处理方式
          case 'auto': //自动处理
            wx.showToast({
              title: res.toastMsg || '登录失败',
              image: '/images/tipfail.png',
              duration: 3000
            });
            break;
          case 'none': //调用方自行处理
            break;
          default:
            console.error('[onLoginFailed] unknown failAction:', failAction);
        }
      },

      authEngineMap: {}, //key: authType, value: BaseAuth
      defaultAuthType: '',
      userAuthHandler: null,

      loginStepAddOn: null,

      pageConfigHandler() {
        let curPages = getCurrentPages();
        let curPage = curPages[curPages.length - 1] || {};
        return curPage.$loginOpts;
      }
    };

    Object.assign(this._configOptions, peerAssign({}, defaultOpts, configOptions));

    //标记状态
    this._stateInfo.isConfigReady = true;

    //初始化
    this._init();
  }

  /**
   * 追加配置项
   * 主要供子类调用，便于子类传递自定义配置项给自定义鉴权器/自定义钩子函数
   * 建议子类将所有自定义配置项封装成一个对象，总共占用一个key，避免未来和父类新增配置项命名冲突
   * @param {string} key 配置项名称
   * @param {object|*} value 配置项值
   * @protected
   */
  _appendConfig(key, value) {
    if (key in this._configOptions) {
      console.error('[BaseLogin] _appendConfig, 新增配置项与已有配置项命名冲突：', key);
      return;
    }

    this._configOptions[key] = value;
  }

  /**
   * 初始化
   * @protected
   */
  _init() {
    //获取最近一次登录信息
    let lastLoginInfo = JSON.parse(wx.getStorageSync(this._configOptions.loginInfoStorage) || 'null');
    this._loginInfo = lastLoginInfo || this._loginInfo;

    //无最近登录信息时，设置默认值
    this._loginInfo.authType = this._loginInfo.authType || this._configOptions.defaultAuthType;

    //有指定前端登录态过期时间时，进行过期处理
    if (this._loginInfo.expireTime > 0 && Date.now() > this._loginInfo.expireTime)
      this.clearLogin();
  }

  /**
   * 登录
   *   | 登录模式 | common | silent | force | forceSilent | forceAuth |
   *   | --- | --- | --- | --- | --- | --- |
   *   | 定位 | 要有登录态 | 有登录态最好，没有就算了 | 要有严格登录态（保证前后端登录态一致且均未过期） | 有严格登录态最好，没有就算了 | 要展示登录界面 |
   *   | 是否复用已有登录信息 | √ | √ | × | × | × |
   *   | 是否尝试静默登录 | √ | √ | √ | √ | × |
   *   | 是否尝试授权登录 | √ | × | √ | × | √ |
   *   | 适用场景 | 适合大部分页面场景，如收藏、留言等 | 适合悄悄个性化，如首页个性化定制，搜索页个性化推荐等 | 适合重要且不能失败重试的场景，如重要的微信数据解密 | 适合不能失败重试但可以不要的场景，如不重要的微信数据解密 | 适合与登录界面强耦合的场景，如开发登录弹窗、演示登录界面 |
   * @param {Object} [options] 登录选项
   * @param {Function} [options.callback], 兼容起见支持回调，但更建议以Promise方式使用
   * @param {string} [options.mode] 登录模式，详见上文函数描述部分
   * @param {BaseLogin~UserAuthHandler} [options.userAuthHandler] 自定义用户授权交互
   * @param {String} [options.failAction] 失败处理方式：auto-自动处理 | none-调用方自行处理 | 其它-和onLoginFailed钩子函数约定的其它处理方式
   * @param {Object} [options.thisIssuer] 触发登录的组件的this对象，供钩子函数使用
   *
   * @return {BaseLogin~LoginRes} 登录结果
   */
  async login(options = {}) {
    //获取配置参数
    const configOptions = this._mergeConfigOptions({
      globalConfig: this._configOptions, //全局配置
      pageConfig: this._configOptions.pageConfigHandler.call(options.thisIssuer), //页面级配置
    });

    //填充调用参数默认值
    const defaultOpts = {
      callback: null,
      mode: 'common',
      userAuthHandler: configOptions.userAuthHandler,
      failAction: 'auto',
      thisIssuer: null, //触发登录的组件的this对象，供钩子函数使用
    };

    options = Object.assign({}, defaultOpts, options);

    //状态记录
    let isNewlyLogin = !this.checkLogin(); //区分 未登录=>已登录 和 已登录=>刷新登录态

    //登录
    let loginRes = {};
    try {
      loginRes = await this._login(options, configOptions);
    } catch (e) {
      loginRes = { code: -500, errMsg: 'internal error' };
      //真机下不支持打印错误栈，导致e打印出来是个空对象；故先单独打印一次e.message
      console.error('[login failed] uncaught error:', e && e.message, e);
    }

    //触发钩子
    if (loginRes.code !== 0 && loginRes.code !== -200) { //钩子：登录失败
      configOptions.onLoginFailed && await configOptions.onLoginFailed.call(options.thisIssuer, loginRes, { failAction: options.failAction })
    }
    if (loginRes.code === 0 && isNewlyLogin) { //钩子：刚刚登录
      configOptions.onNewlyLogin && await configOptions.onNewlyLogin.call(options.thisIssuer);
    }

    //返回结果
    options.callback && options.callback(loginRes);
    return loginRes;
  }

  /**
   * 合并配置项
   * @param globalConfig 全局配置，格式参见{@link BaseLogin#config}
   * @param pageConfig 页面级配置，格式同全局配置，但只接受以下字段：
   * | 字段 | 和全局配置的关系 |
   * | --- | --- |
   * | onUserAuthFailed | 并存 |
   * | onUserAuthSucceeded | 并存 |
   * | onNewlyLogin | 并存 | 
   * | onLoginFailed | 并存 |
   * | userAuthHandler | 覆盖 |
   * @return {object} 合并后的配置项，格式参见{@link BaseLogin#config}
   * @protected
   */
  _mergeConfigOptions({ globalConfig, pageConfig }) {
    let configOptions = Object.assign({}, globalConfig); //结果

    //未指定页面级配置，直接返回
    if (!pageConfig)
      return configOptions;

    //合并配置项
    const fieldMetas = [ //字段信息列表
      {
        field: 'onUserAuthFailed', //字段
        action: 'combineFunc' //处理方式
      },
      {
        field: 'onUserAuthSucceeded',
        action: 'combineFunc'
      },
      {
        field: 'onNewlyLogin',
        action: 'combineFunc'
      },
      {
        field: 'onLoginFailed',
        action: 'combineFunc'
      },
      {
        field: 'userAuthHandler',
        action: 'override'
      },
    ];

    for (let { field, action } of fieldMetas) {
      if (!(field in pageConfig))
        continue;

      switch (action) {
        case 'override':
          configOptions[field] = pageConfig[field];
          break;
        case 'combineFunc':
          configOptions[field] = combineFuncs({
            funcs: [pageConfig[field], globalConfig[field]]
          });
          break;
        default:
          console.error('[_mergeConfigOptions] unknown action:', action, 'for field:', field);
      }
    }

    //返回合并结果
    return configOptions;
  }


  /**
   * @private
   */
  async _login(options, configOptions) {

    //初始状态：未开始
    let loginRes = { code: -1, errMsg: 'idle' };

    //尝试复用本地登录态
    let canUseLocal = !['force', 'forceSilent', 'forceAuth'].includes(options.mode); //是否可复用本地登录态
    loginRes = canUseLocal && this.checkLogin() ? { code: 0, errMsg: 'ok' } : loginRes; //本地登录状态
    if (loginRes.code === 0) //当前已登录且模式无特殊要求，按成功返回
      return { code: 0, errMsg: 'ok' };

    //尝试静默登录
    let canUseSilent = !['forceAuth'].includes(options.mode); //是否可尝试静默登录
    loginRes = canUseSilent ? await this._silentLogin(options, configOptions) : loginRes;
    options.authFlowId = loginRes.authFlowId

    if (loginRes.code === 0) //静默登录成功，结束
      return { code: 0, errMsg: 'ok' };

    //尝试授权登录
    let canUseAuth = !['silent', 'forceSilent'].includes(options.mode); //是否可尝试授权登录
    loginRes = canUseAuth ? await this._authLogin(options, configOptions) : loginRes;
    if (loginRes.code === 0) //授权登录成功，结束
      return { code: 0, errMsg: 'ok' };

    //全部尝试失败，根据模式调整返回值
    if (['silent', 'forceSilent'].includes(options.mode)) //静默模式错误码调整为统一值（这些模式不想让用户感知到登录失败）
      loginRes.code = -200;

    //返回最终失败结果
    return loginRes;
  }

  /**
   * 静默登录
   * 在用户无感知的情况下悄悄完成登录过程
   * @param options 登录调用参数，格式参见{@link BaseLogin#login}
   * @param configOptions 登录配置参数，格式参见{@link BaseLogin#config}
   * @return {Promise<*>}
   * @private
   */
  @mergingStep //步骤并合，避免页面中多处同时触发登录时重复发起登录请求
  async _silentLogin(options, configOptions) {

    //判断使用的验证方式
    let authType = this._loginInfo.authType;
    if (authType === 'none')
      return { code: -200, errMsg: 'login failed silently: disabled' };

    //获取验证方式对应的鉴权器
    let authEngine = configOptions.authEngineMap[authType];
    if (!authEngine) {
      console.error('[login] _silentLogin, cannot find authEngine for authType:', authType);
      return { code: -500, errMsg: 'login failed silently: internal error' };
    }


    //尝试静默登录
    let silentRes = {};
    try {
      silentRes = await authEngine.silentLogin({
        loginOptions: options,
        configOptions,
      });
    } catch (e) {
      console.error('[login] caught error when try silentLogin of authType:', authType, 'err:', e);
      silentRes = { succeeded: false, errMsg: 'internal error' };
    }



    //更新匿名信息（登录成功前使用的临时标识，成功后继续关联）
    silentRes.anonymousInfo && this._saveAnonymousInfo(silentRes.anonymousInfo);

    //登录失败，返回
    if (!silentRes.succeeded)
      return { code: -200, authFlowId: silentRes.authFlowId, errMsg: 'login failed silently: normal' };

    //登录成功，保存相关信息
    return this._afterFetchInfoPack({
      isLogin: true,
      userInfo: silentRes.userInfo,
      expireTime: silentRes.expireTime,
      authType,
    });
  }

  /**
   * 授权登录
   * 需要用户配合才能完成的登录过程
   * @param options 登录调用参数，格式参见{@link BaseLogin#login}
   * @param configOptions 登录配置参数，格式参见{@link BaseLogin#config}
   * @return {Promise<*>}
   * @private
   */
  @mergingStep //步骤并合，避免页面中多处同时触发登录时重复发起登录请求
  async _authLogin(options, configOptions) {

    //执行各鉴权器的beforeAuthLogin钩子
    let beforeResMap = {};
    for (let authType of Object.keys(configOptions.authEngineMap)) {
      let authEngine = configOptions.authEngineMap[authType];
      beforeResMap[authType] = authEngine.beforeAuthLogin ? await authEngine.beforeAuthLogin({
        loginOptions: options,
        configOptions,
      }) : null;
    }


    //展示登录界面，等待用户交互
    let userAuthRes = await this._handleUserAuth(options);
    console.log('=============返回用户的操作额吉锅给')


    //交互失败（e.g.用户取消登录）
    if (!userAuthRes.succeeded) {
      configOptions.onUserAuthFailed && configOptions.onUserAuthFailed.call(options.thisIssuer, {});
      return { code: -100, errMsg: 'user auth failed:' + userAuthRes.errMsg }
    }

    //交互成功

    //触发钩子：onUserAuthSucceeded
    configOptions.onUserAuthSucceeded && configOptions.onUserAuthSucceeded.call(options.thisIssuer);

    //根据用户提供的信息进行登录
    let authType = userAuthRes.authType;
    let authEngine = configOptions.authEngineMap[authType];
    if (!authEngine) {
      console.error(`[login] 当前指定的登录方式：${authType}，不存在对应的鉴权器`);
      return { code: -500, errMsg: 'internal error' };
    }



    let authRes = await authEngine.authLogin({
      loginOptions: options,
      configOptions,
      authData: userAuthRes.authData,
      beforeRes: beforeResMap[authType],
    });

    //更新匿名信息（登录成功前使用的临时标识，成功后继续关联）
    authRes.anonymousInfo && this._saveAnonymousInfo(authRes.anonymousInfo);

    //登录失败，返回
    if (!authRes.succeeded)
      return { code: -300, errMsg: `auth login failed: ${authRes.errMsg}`, toastMsg: authRes.toastMsg };

    //登录成功，保存相关信息
    return this._afterFetchInfoPack({
      isLogin: true,
      userInfo: authRes.userInfo,
      expireTime: authRes.expireTime,
      authType,
    });
  }

  /**
   * 授权交互处理
   * @param options 登录选项，参见{@link BaseLogin#login}
   * @return {BaseLogin~UserAuthRes}
   * @protected
   */
  async _handleUserAuth(options) {
    return await options.userAuthHandler.call(options.thisIssuer);
  }

  /**
   * 登录信息获取完毕后续步骤集合
   * @private
   * @param {BaseLogin~LoginInfo} loginInfo 登录信息
   */
  async _afterFetchInfoPack(loginInfo) {
    this._saveInfo(loginInfo);

    let addOnRes = await this._handleAddOn();
    if (!addOnRes.succeeded) {
      this.clearLogin();
      return { code: -400, errMsg: addOnRes.errMsg || 'add on failed', toastMsg: addOnRes.toastMsg };
    }

    return { code: 0, errMsg: 'ok' };
  }

  /**
   * 保存/更新登录信息
   * @param {BaseLogin~LoginInfo} loginInfo 登录信息
   * @protected
   */
  _saveInfo(loginInfo) {
    Object.assign(this._loginInfo, loginInfo);

    wx.setStorage({
      key: this._configOptions.loginInfoStorage,
      data: JSON.stringify(this._loginInfo)
    });
  }

  /**
   * 保存/更新匿名信息
   * @param {object} anonymousInfo 匿名信息
   * @protected
   */
  _saveAnonymousInfo(anonymousInfo) {
    Object.assign(this._loginInfo.anonymousInfo, anonymousInfo);

    wx.setStorage({
      key: this._configOptions.loginInfoStorage,
      data: JSON.stringify(this._loginInfo)
    });
  }

  /**
   * 支持使用方配置自定义附加步骤，会在正常登录流程执行成功时调用，并根据其处理结果生成最终登录结果
   * @return {BaseLogin~LoginStepAddOnRes}
   * @protected
   */
  async _handleAddOn() {
    if (!this._configOptions.loginStepAddOn)
      return { succeeded: true };

    let stepRes = await this._configOptions.loginStepAddOn();

    if (typeof stepRes !== "object") {
      console.error('[login] loginStepAddOn shall return an object, something like "{succeeded: true, errMsg:\'debug detail\', toastMsg: \'alert detail\'}", yet got return value:', stepRes);
      stepRes = { succeeded: false };
    }

    return stepRes;
  }

  /**
   *退出登录
   * @param {boolean} needClearAuth 是否需要清除鉴权信息：false-仅清除登录态，下次还可以静默登录 | true-同时清除鉴权信息，下次必须授权登录
   * @return {Object} res 退出登录结果，格式形如：{code:0, errMsg:'ok'}
   */
  logout({ needClearAuth = false } = {}) {
    this.clearLogin({ needClearAuth });
    return { code: 0, errMsg: 'ok' };
  }

  /**
   * 重新登录
   * @return {BaseLogin~LoginRes} 登录结果
   */
  async reLogin(...args) {
    await this.logout();
    return await this.login(...args);
  }

  /**
   * 清除前端登录态
   * @param {boolean} needClearAuth 是否需要清除鉴权信息：false-仅清除登录态，下次还可以静默登录 | true-同时清除鉴权信息，下次必须授权登录
   */
  clearLogin({ needClearAuth = false } = {}) {
    this._loginInfo.isLogin = false;
    this._loginInfo.userInfo = {};
    this._loginInfo.expireTime = -1;
    this._loginInfo.authType = needClearAuth ? 'none' : this._loginInfo.authType;

    wx.setStorage({
      key: this._configOptions.loginInfoStorage,
      data: JSON.stringify(this._loginInfo)
    });
  }

  /**
   * 检查是否登录
   * @return {boolean}  是否登录
   */
  checkLogin() {
    return this._loginInfo.isLogin;
  }

  /**
   * 将方法封装为通用函数，使之可以在任意this对象上执行
   * @param {String} methodName 方法名
   * @return {Function} 封装后的函数
   */
  makeAssignableMethod(methodName) {
    return makeAssignableMethod({
      instance: this,
      method: methodName,
      rcvThis: {
        argIdx: 0,
        argProp: 'thisIssuer'
      }
    });
  }

  /**
   * 获取用户信息
   * @return {Object} 用户信息
   */
  get userInfo() {
    return deepClone(this._loginInfo.userInfo);
  }
}

/**
 * 类修饰器，确保调用API时已完成模块配置
 * @ignore
 * @param target
 */
function requireConfig(target) {
  let descriptors = Object.getOwnPropertyDescriptors(target.prototype);
  for (let prop of Object.getOwnPropertyNames(descriptors)) {
    let descriptor = descriptors[prop];
    if (typeof descriptor.value !== "function") //非函数，不予处理
      continue;
    if (['constructor', 'config'].includes(prop) || prop[0] === '_')  //无需配置的函数、私有函数，不予处理
      continue;

    descriptor.value = (function (oriFunc, funcName) {  //对外接口，增加配置检查步骤
      return function (...args) {
        if (!this._stateInfo.isConfigReady) { //若未进行项目信息配置，则报错
          console.error('[Login] 请先进行模块配置，后调用模块相关功能', '试图调用：', funcName);
          return;
        }
        return oriFunc.apply(this, args); //否则正常执行原函数
      }
    }(descriptor.value, prop));

    Object.defineProperty(target.prototype, prop, descriptor);
  }
}

/**
 * @typedef {Function} BaseLogin~OnLoginFailed 登录失败钩子函数
 * @param {BaseLogin~LoginRes} loginRes 登录结果
 * @param {object} options  选项
 * @param {string} options.failAction 调用方希望的失败处理方式：auto-自动处理 | none-调用方自行处理 | 其它约定值
 * @example
    onLoginFailed(res, {failAction}){
      switch (failAction) { //调用方希望的失败处理方式
        case 'auto': //自动处理
          wx.showToast({
            title: res.toastMsg || '登录失败',
            image: '/images/tipfail.png',
            duration: 3000
          });
          break;
        case 'none': //调用方自行处理
          break;
        default:
          console.error('[onLoginFailed] unknown failAction:', failAction);
      }
    }
 */
/**
* @typedef {object} BaseLogin~LoginRes 登录结果
* @property {number} code 状态码
 * | code | 语义 |
 * | --- | --- |
 * | 0 | 成功 |
 * | -100 | 用户交互失败 e.g.用户拒绝授权等 |
 * | -200 | 静默失败，静默登录失败且调用方要求不要尝试授权登录 |
 * | -300 | 授权登录失败 |
 * | -400 | 附加步骤返回失败结果 |
 * | -500 | 模块内部异常 |
* @property {string} errMsg 详细错误日志，debug用
* @property {string} [toastMsg] （若有）用户话术，提示失败原因
* @example
   {
     code: -300, //状态码，0为成功
     errMsg:'login api failed...', //详细错误日志，debug用
     toastMsg: '您的账号存在安全风险，请联系客服进行处理' //（若有）用户话术，提示失败原因
   }
*/

/**
 * @typedef {Function} BaseLogin~UserAuthHandler 授权交互处理函数，负责跟用户交互，收集鉴权所需信息
 * @async
 * @return {BaseLogin~UserAuthRes} 交互结果
 */

/**
 * @typedef {object} BaseLogin~UserAuthRes userAuthHandler交互结果
 * @property {boolean} succeeded 是否成功
 * @property {string} errMsg 错误信息，调试用
 * @property {string} authType 用户选择的登录方式
 * @property {object} authData 交互数据，格式由该登录方式对应的鉴权器指定
 */

/**
 * @typedef {Function} BaseLogin~LoginStepAddOn 登录流程自定义附加步骤
 * @async
 * @return {BaseLogin~LoginStepAddOnRes}
 */

/**
 * @typedef {object} BaseLogin~LoginStepAddOnRes 登录流程自定义附加步骤处理结果
 * @property {boolean} succeeded 是否成功
 * @property {string} [errMsg] 详细失败原因，debug用
 * @property {string} [toastMsg] （若有）用户话术，提示失败原因
 */

/**
 * @typedef {object} BaseLogin~LoginInfo 登录信息
 * @property {boolean} isLogin 是否登录
 * @property {object} userInfo 用户信息
 * @property {number} expireTime 过期时间，绝对毫秒数，-1表示长期有效
 * @property {string} authType 使用的验证方式
 * @property {object} [anonymousInfo] 匿名信息（登录成功前使用的临时标识，成功后继续关联）
 */

export default BaseLogin;