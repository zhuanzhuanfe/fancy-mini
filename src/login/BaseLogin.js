import {deepClone, makeAssignableMethod} from '../operationKit';
import {mergingStep, errSafe} from '../decorators';

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
  
  constructor(configOptions){
    configOptions && this.config(configOptions);
  }

  /**
   * 模块配置
   * @param {Object} configOptions 
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
      /**
       * 登录相关信息存储到storage时使用的key
       */
      loginInfoStorage: '__loginInfo',
      /**
       * 请求管理器，为Requester对象
       */
      requester: null,
      
      /**
       * 钩子函数，获取用户授权信息失败时触发
       * @param {string} type  失败类型： deny-用户拒绝授权 | unknown-其它原因
       */
      onUserAuthFailed: null,
      /**
       * 钩子函数，获取用户授权信息成功时触发
       */
      onUserAuthSucceeded: null,
      /**
       * 钩子函数，刚刚登录成功时调用（未登录=>已登录）
       */
      onNewlyLogin: null,
      /**
       * 钩子函数，登录失败时调用
       * @param {Object} res 登录结果，格式形如：{
            code: 0,   //状态码，0为成功，其它为失败
            errMsg:'login api failed...',  //详细错误日志，debug用
            toastMsg: '您的账号存在安全风险，请联系客服进行处理'  //（若有）用户话术，提示失败原因
         }
       */
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
      
      /**
       * 登录流程自定义附加步骤，为一个处理函数，会在正常登录流程执行成功时调用，并根据其处理结果生成最终登录结果
       *  @return {Promise<Object>} res 处理结果，格式形如：{
            succeeded: true,   //是否成功
            errMsg:'login api failed...',  //详细失败原因，debug用
            toastMsg: '您的账号存在安全风险，请联系客服进行处理'  //（若有）用户话术，提示失败原因
         }
       */
      loginStepAddOn: null,
    };

    Object.assign(this._configOptions, defaultOpts, configOptions); //todo: 只保留所需字段，避免调用方传入过多字段污染变量
    
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
   *    force - 强制模式，适合解码场景：刷新微信session，保证解码加密数据时session不过期
   *    silentForce - 静默刷新模式，适合静默解码场景：对老用户，刷新微信session，保证解码加密数据时session不过期；对新用户，不触发授权
   * @param {Function} [options.userAuthHandler] 自定义用户授权逻辑
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
  async login(options){
    //参数处理
    if (typeof options === "function") //兼容旧版入参格式
      options = {callback: options};
    
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
    //若已登录且不是强制模式，直接返回
    if (options.mode!=='force' && options.mode!=='silentForce' && this.checkLogin())
      return {code:0, errMsg:'ok'};
    
    //尝试静默登录
    let silentRes = await this._silentLogin(options);
    if (silentRes.code === 0) //静默登录成功，结束
      return {code: 0, errMsg: 'ok'};

    //静默模式，只尝试静默登录，不触发授权弹窗；不管成功失败都不影响页面功能和后续接口调用
    if (options.mode==='silent' || options.mode==='silentForce')
      return {code: -200, errMsg: 'login failed silently'};

    //尝试授权登录
    return await this._authLogin(options);
  }
  
  @mergingStep
  async _silentLogin(options){
    //获取当前验证方式对应的鉴权器
    let authType = options.silentAuthType || this._loginInfo.authType;
    let authEngine = this._configOptions.authEngineMap[authType];
    if (!authEngine) {
      console.error('[login] _silentLogin, cannot find authEngine for authType:', authType);
      return {code: -500, errMsg: 'internal error'};
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
      return {code: -200, errMsg: 'login failed silently'};
    
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
      console.error(`[login] 当前指定的登录方式：${authType}，不存在对应的处理器`);
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
   * @return {Object} res 退出登录结果，格式形如：{code:0, errMsg:'ok'}
   */
  async logout(){
    this.clearLogin();
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
   */
  clearLogin(){
    this._loginInfo.isLogin = false;
    this._loginInfo.userInfo = {};
    this._loginInfo.expireTime = -1;
    
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