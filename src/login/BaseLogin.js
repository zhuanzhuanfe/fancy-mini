import {deepClone, makeAssignableMethod, peerAssign} from '../operationKit';
import {mergingStep, errSafe} from '../decorators';

/**
 * 登录模块
 */
@requireConfig //确保调用API时已完成项目信息配置
export default class BaseLogin {
  //配置
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
   * @param {object} [configOptions] 配置项，格式参见config函数
   */
  constructor(configOptions){
    configOptions && this.config(configOptions);
  }

  /**
   * 模块配置
   * @param {Object} configOptions 
   * @param {String} [configOptions.loginInfoStorage] 登录相关信息存储到storage时使用的key
   * @param {Requester} configOptions.requester 请求管理器，为Requester对象（参见/src/request/Requester）
   * @param {Function} [configOptions.onUserAuthFailed] 钩子函数，获取用户授权信息失败时触发
   * @param {Function} [configOptions.onUserAuthSucceeded] 钩子函数，获取用户授权信息成功时触发
   * @param {Function} [configOptions.onNewlyLogin] 钩子函数，刚刚登录成功时触发（未登录=>已登录）
   * @param {Function} [configOptions.onLoginFailed] 钩子函数，登录失败时触发
        入参：登录结果，格式形如：{
            code: 0,   //状态码，0为成功，其它为失败
            errMsg:'login api failed...',  //详细错误日志，debug用
            toastMsg: '您的账号存在安全风险，请联系客服进行处理'  //（若有）用户话术，提示失败原因
         }
   * @param {Object} configOptions.authEngineMap 鉴权器映射表
        key为登录方式，value为对应的鉴权器（BaseAuth对象，参见/src/login/auth/BaseAuth）
        e.g. {
          'wechat' : new WechatAuth(), //微信登录，WechatAuth应继承于BaseAuth
          'phone' : new PhoneAuth(), //手机号登录，PhoneAuth应继承于BaseAuth
        }
   * @param {String} configOptions.defaultAuthType 默认登录方式
   * @param {Function} configOptions.userAuthHandler 授权交互处理函数（async），负责跟用户交互，收集鉴权所需信息
        入参：无
        返回值：形如 {
          succeeded: true, //是否成功
          errMsg: '', //错误信息，调试用
          authType: '', //用户选择的登录方式
          authData: {}, //交互数据，格式由该登录方式对应的鉴权器指定
        }
   * @param {Function} [configOptions.loginStepAddOn] 登录流程自定义附加步骤，为一个async函数，会在正常登录流程执行成功时调用，并根据其处理结果生成最终登录结果
        入参：无
        处理结果，格式形如：{
            succeeded: true,   //是否成功
            errMsg:'login api failed...',  //详细失败原因，debug用
            toastMsg: '您的账号存在安全风险，请联系客服进行处理'  //（若有）用户话术，提示失败原因
         }
   */
  config(configOptions){
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
      onLoginFailed(res){
        wx.showToast({
          title: res.toastMsg || '登录失败',
          image: '/images/tipfail.png',
          duration: 3000
        });
      },
      
      authEngineMap: {}, //key: authType, value: BaseAuth
      defaultAuthType: '',
      userAuthHandler: null,
      
      loginStepAddOn: null,
    };

    Object.assign(this._configOptions, peerAssign({}, defaultOpts, configOptions));
    
    //初始化
    this._init();
    
    //标记状态
    this._stateInfo.isConfigReady = true;
  }

  /**
   * 追加配置项
   * 主要供子类调用，便于子类传递自定义配置项给自定义鉴权器/自定义钩子函数
   * 建议子类将所有自定义配置项封装成一个对象，总共占用一个key，避免未来和父类新增配置项命名冲突
   * @param {string} key 配置项名称
   * @param {object|*} value 配置项值
   * @protected
   */
  _appendConfig(key, value){
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
  _init(){
    //获取最近一次登录信息
    let lastLoginInfo = JSON.parse(wx.getStorageSync(this._configOptions.loginInfoStorage) || 'null');
    this._loginInfo = lastLoginInfo || this._loginInfo;
    
    //无最近登录信息时，设置默认值
    this._loginInfo.authType = this._loginInfo.authType || this._configOptions.defaultAuthType;
    
    //有指定前端登录态过期时间时，进行过期处理
    if (this._loginInfo.expireTime>0 && Date.now()>this._loginInfo.expireTime)
      this.clearLogin();
  }
  
  /**
   * 登录
   * @param {Object} [options] 登录选项
   * @param {Function} [options.callback], 兼容起见支持回调，但更建议以Promise方式使用
   * @param {string} [options.mode] 登录模式
   *    common - 通用模式，适合大部分页面场景
   *    silent - 静默模式，适合免打扰场景：只尝试静默登录，不触发授权弹窗；不管成功失败都不影响页面功能和后续接口调用
   *    force - 强制模式，刷新登录态
   *    forceSilent - 强制静默登录，对老用户，刷新登录态；对新用户，不触发授权
   *    forceAuth - 强制授权登录，强制展示授权界面
   * @param {Function} [options.userAuthHandler] 自定义用户授权交互
   * @param {string} [options.silentAuthType] 指定静默登录时使用哪种鉴权方式
   * @param {Object} [options.thisIssuer] 触发登录的组件的this对象，供钩子函数使用
   * @return {Promise<Object>} res 登录结果，格式形如：{
            code: 0,   //状态码，0为成功，其它为失败
            errMsg:'login api failed...',  //详细错误日志，debug用
            toastMsg: '您的账号存在安全风险，请联系客服进行处理'  //（若有）用户话术，提示失败原因
         }
   *   code:
   *   -100 用户交互失败 e.g.用户拒绝授权等
   *   -200 静默模式登录失败
   *   -300 授权登录失败
   *   -400  附加步骤返回失败结果
   *   -500 模块内部异常
   */
  async login(options={}){
    //填充默认值
    const defaultOpts = {
      callback: null,
      mode: 'common',
      userAuthHandler: this._configOptions.userAuthHandler,
      thisIssuer: null, //触发登录的组件的this对象，供钩子函数使用
    };

    options = Object.assign({}, defaultOpts, options);
    
    //状态记录
    let isNewlyLogin = !this.checkLogin(); //区分 未登录=>已登录 和 已登录=>刷新登录态
    
    //登录
    let loginRes = {};
    try {
      loginRes = await this._login(options);
    } catch (e){
      loginRes = {code: -500, errMsg:'internal error'};
      //真机下不支持打印错误栈，导致e打印出来是个空对象；故先单独打印一次e.message
      console.error('[login failed] uncaught error:',e && e.message, e); 
    }
    
    //触发钩子
    if (loginRes.code!==0 && loginRes.code!==-200) { //钩子：登录失败
      this._configOptions.onLoginFailed && await this._configOptions.onLoginFailed.call(options.thisIssuer, loginRes)
    }
    if (loginRes.code===0 && isNewlyLogin) { //钩子：刚刚登录
      this._configOptions.onNewlyLogin && await this._configOptions.onNewlyLogin.call(options.thisIssuer);
    }
    
    //返回结果
    options.callback && options.callback(loginRes);
    return loginRes;
  }
  
  async _login(options){
    //初始状态：未开始
    let loginRes = {code: -1, errMsg: 'idle'};
    
    //尝试复用本地登录态
    let canUseLocal = !['force', 'forceSilent', 'forceAuth'].includes(options.mode); //是否可复用本地登录态
    loginRes = canUseLocal && this.checkLogin() ? {code: 0, errMsg: 'ok'} :  loginRes; //本地登录状态
    if (loginRes.code === 0) //当前已登录且模式无特殊要求，按成功返回
      return {code: 0, errMsg: 'ok'};
    
    //尝试静默登录
    let canUseSilent = !['forceAuth'].includes(options.mode); //是否可尝试静默登录
    loginRes = canUseSilent ? await this._silentLogin(options) : loginRes;
    if (loginRes.code === 0) //静默登录成功，结束
      return {code: 0, errMsg: 'ok'};
    
    //尝试授权登录
    let canUseAuth = !['silent', 'forceSilent'].includes(options.mode); //是否可尝试授权登录
    loginRes = canUseAuth ?  await this._authLogin(options) : loginRes;
    if (loginRes.code === 0) //授权登录成功，结束
      return {code: 0, errMsg: 'ok'};

    //全部尝试失败，根据模式调整返回值
    if (['silent', 'forceSilent'].includes(options.mode)) //静默模式错误码调整为统一值（这些模式不想让用户感知到登录失败）
      loginRes.code = -200;
    
    //返回最终失败结果
    return loginRes;
  }
  
  @mergingStep
  async _silentLogin(options){
    //判断使用的验证方式
    let authType = options.silentAuthType || this._loginInfo.authType;
    if (authType === 'none')
      return {code: -200, errMsg: 'login failed silently: disabled'};

    //获取验证方式对应的鉴权器
    let authEngine = this._configOptions.authEngineMap[authType];
    if (!authEngine) {
      console.error('[login] _silentLogin, cannot find authEngine for authType:', authType);
      return {code: -500, errMsg: 'login failed silently: internal error'};
    }
    
    //尝试静默登录
    let silentRes = {};
    try {
      silentRes = await authEngine.silentLogin({
        loginOptions: options,
        configOptions: this._configOptions,
      });
    } catch (e) {
      console.error('[login] caught error when try silentLogin of authType:', authType, 'err:', e);
      silentRes = {succeeded: false, errMsg: 'internal error'};
    }

    //更新匿名信息（登录成功前使用的临时标识，成功后继续关联）
    silentRes.anonymousInfo && this._saveAnonymousInfo(silentRes.anonymousInfo);
    
    //登录失败，返回
    if (!silentRes.succeeded)
      return {code: -200, errMsg: 'login failed silently: normal'};
    
    //登录成功，保存相关信息
    return this._afterFetchInfoPack({
      isLogin: true,
      userInfo: silentRes.userInfo,
      expireTime: silentRes.expireTime,
      authType,
    });
  }
  
  @mergingStep
  async _authLogin(options){
    //执行各鉴权器的beforeAuthLogin钩子
    let beforeResMap = {};
    for (let authType of Object.keys(this._configOptions.authEngineMap)) {
      let authEngine = this._configOptions.authEngineMap[authType];
      beforeResMap[authType] = authEngine.beforeAuthLogin ? await authEngine.beforeAuthLogin({
        loginOptions: options,
        configOptions: this._configOptions,
      }) : null;
    }
    
    //展示登录界面，等待用户交互
    let userAuthRes = await this._handleUserAuth(options);
    
    //交互失败（e.g.用户取消登录）
    if (!userAuthRes.succeeded) {
      this._configOptions.onUserAuthFailed && this._configOptions.onUserAuthFailed.call(options.thisIssuer,{});
      return {code: -100, errMsg: 'user auth failed:' + userAuthRes.errMsg}
    }
    
    //交互成功
    
    //触发钩子：onUserAuthSucceeded
    this._configOptions.onUserAuthSucceeded && this._configOptions.onUserAuthSucceeded.call(options.thisIssuer);
    
    //根据用户提供的信息进行登录
    let authType = userAuthRes.authType;
    let authEngine = this._configOptions.authEngineMap[authType];
    if (!authEngine) {
      console.error(`[login] 当前指定的登录方式：${authType}，不存在对应的鉴权器`);
      return {code: -500, errMsg: 'internal error'};
    }
    let authRes = await authEngine.authLogin({
      loginOptions: options,
      configOptions: this._configOptions,
      authData: userAuthRes.authData,
      beforeRes: beforeResMap[authType],
    });

    //更新匿名信息（登录成功前使用的临时标识，成功后继续关联）
    authRes.anonymousInfo && this._saveAnonymousInfo(authRes.anonymousInfo);
    
    //登录失败，返回
    if (!authRes.succeeded)
      return {code: -300, errMsg: `auth login failed: ${authRes.errMsg}`, toastMsg: authRes.toastMsg};

    //登录成功，保存相关信息
    return this._afterFetchInfoPack({
      isLogin: true,
      userInfo: authRes.userInfo,
      expireTime: authRes.expireTime,
      authType,
    });
  }
  
  /**
   * 
   * @param options
   * @return {Promise<{succeeded: boolean, errMsg: string, authType: string, authData: {}}>} 
   * 交互结果，格式形如： {
      succeeded: true, //是否成功
      errMsg: '', //错误信息，调试用
      authType: '', //用户选择的验证方式
      authData: {}, //交互数据，格式由该验证方式对应的鉴权器指定
    }
   * @protected
   */
  async _handleUserAuth(options){
    return await options.userAuthHandler.call(options.thisIssuer);
  }
  
  /**
   * 登录信息获取完毕后续步骤集合
   */
  async _afterFetchInfoPack(loginInfo){
    this._saveInfo(loginInfo);

    let addOnRes = await this._handleAddOn();
    if (!addOnRes.succeeded) {
      this.clearLogin();
      return {code: -400, errMsg: addOnRes.errMsg||'add on failed', toastMsg: addOnRes.toastMsg};
    }
    
    return {code: 0, errMsg: 'ok'};
  }
  
  _saveInfo(loginInfo){
    Object.assign(this._loginInfo, loginInfo);

    wx.setStorage({
      key: this._configOptions.loginInfoStorage,
      data: JSON.stringify(this._loginInfo)
    });
  }

  _saveAnonymousInfo(anonymousInfo){
    Object.assign(this._loginInfo.anonymousInfo, anonymousInfo);
    
    wx.setStorage({
      key: this._configOptions.loginInfoStorage,
      data: JSON.stringify(this._loginInfo)
    });
  }
  
  /**
   * 支持使用方配置自定义附加步骤，会在正常登录流程执行成功时调用，并根据其处理结果生成最终登录结果
   * @return {Promise<*>}
   */
  async _handleAddOn(){
    if (!this._configOptions.loginStepAddOn)
      return {succeeded: true};

    let stepRes = await this._configOptions.loginStepAddOn();

    if (typeof stepRes !== "object"){
      console.error('[login] loginStepAddOn shall return an object, something like "{succeeded: true, errMsg:\'debug detail\', toastMsg: \'alert detail\'}", yet got return value:', stepRes);
      stepRes = {succeeded: false};
    }

    return stepRes;
  }
  
  /**
   *退出登录
   * @param {boolean} needClearAuth 是否需要清除鉴权信息：false-仅清除登录态，下次还可以静默登录 | true-同时清除鉴权信息，下次必须授权登录
   * @return {Object} res 退出登录结果，格式形如：{code:0, errMsg:'ok'}
   */
  logout({needClearAuth = false}={}){
    this.clearLogin({needClearAuth});
    return {code: 0};
  }

  /**
   * 重新登录
   * @return {Object} 登录结果，格式同login
   */
  async reLogin(...args){
    await this.logout();
    return await this.login(...args);
  }

  /**
   * 清除前端登录态
   * @param {boolean} needClearAuth 是否需要清除鉴权信息：false-仅清除登录态，下次还可以静默登录 | true-同时清除鉴权信息，下次必须授权登录
   */
  clearLogin({needClearAuth=false}={}){
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
  checkLogin(){
    return this._loginInfo.isLogin;
  }

  /**
   * 将方法封装为通用函数，使之可以在任意this对象上执行
   * @param {String} methodName 方法名
   * @return {Function} 封装后的函数
   */
  makeAssignableMethod(methodName){
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
   * 获取用户信息（只读，不允许直接修改）
   * @return {Object} 用户信息
   */
  get userInfo(){
    return deepClone(this._loginInfo.userInfo);
  }
}

/**
 * 类修饰器，确保调用API时已完成项目信息配置
 * @param target
 */
function requireConfig(target) {
  let descriptors = Object.getOwnPropertyDescriptors(target.prototype);
  for (let prop of Object.getOwnPropertyNames(descriptors)){
    let descriptor = descriptors[prop];
    if (typeof descriptor.value !== "function") //非函数，不予处理
      continue;
    if (['constructor', 'config'].includes(prop) || prop[0]==='_')  //无需配置的函数、私有函数，不予处理
      continue;

    descriptor.value = (function (oriFunc, funcName) {  //对外接口，增加配置检查步骤
      return function (...args) {
        if (!this._stateInfo.isConfigReady){ //若未进行项目信息配置，则报错
          console.error('[Login] 请先进行模块配置，后调用模块相关功能', '试图调用：', funcName);
          return;
        }
        return oriFunc.apply(this, args); //否则正常执行原函数
      }
    }(descriptor.value, prop));
    
    Object.defineProperty(target.prototype, prop, descriptor);
  }
}