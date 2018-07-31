import History from './History';
import {makeMutex, noConcurrent} from '../decorator/noConcurrent';
import {ctxDependConsole as console} from '../debugKit';
import {delay, appendUrlParam, toAbsolutePath} from '../operationKit';
import {customWxPromisify} from '../wxPromise';

const NAV_BUSY_REMAIN = 300;  //实践发现，navigateTo成功回调之后页面也并未完全完成跳转，故将跳转状态短暂延长，单位：ms
let wxPromise=null, wxResolve=null; //部分API支持用户自定义覆盖，因而等到配置环节再予以实例化

let globalStore = {
  env: {
    os: 'ios'
  }
};

wx.getSystemInfo({
  success(sysInfo){
    globalStore.env.os = sysInfo.system.toLowerCase().includes('ios') ? 'ios' : 'android';
  }
});

/**
 * 导航器
 * 由于小程序只支持最多5级页面（后放宽至10级），但需求上希望维护更长的历史栈，故自行维护完整历史栈并改写默认导航操作
 * 使用：详见 docs/无限层级路由方案.md
 */
export default class Navigator {
  static _config = {
    enableCurtain: true, //是否开启空白中转策略
    curtainPage: '/pages/curtain/curtain',  //空白中转页，避免自定义返回行为时出现原生上一层级内容一闪而过的现象

    enableTaintedRestore: true, //是否开启实例覆盖自动恢复策略

    /**
     * 自定义页面数据恢复函数，用于
     * 1. wepy实例覆盖问题，存在两级同路由页面时，前者数据会被后者覆盖，返回时需予以恢复
     * 2. 层级过深时，新开页面会替换前一页面，导致前一页面数据丢失，返回时需予以恢复
     *
     * @param {string} route.url 页面url，绝对路径
     * @param {object} route.wxPage  页面卸载前的原生页面实例拷贝
     * @param {string} context  数据丢失场景： tainted - 实例覆盖问题导致的数据丢失 | unloaded - 层级问题导致的数据丢失
     * @return {boolean} res.succeeded  数据恢复是否成功，若成功，则恢复结束；若失败，则模块将继而尝试使用默认恢复策略
     *
     * e.g. function({route, context}){return {succeeded: true}}
     */
    pageRestoreHandler: null,

    MAX_LEVEL: 10, //小程序支持打开的页面层数

    oriNavOverrides: {}, //自定义覆盖部分/全部底层跳转api（wx.navigateTo、wx.redirectTo等），接口及参数格式同wx
  };
  static _history = new History({routes: [{url:''}]}); //完整历史栈
  static _activeUnload = false;   //是否为主动触发的页面卸载： true-代码主动调用导致； false-用户点击了物理返回键/左上角返回按钮导致

  /**
   * 安装
   * @param {Object} options 自定义配置，可配置项参见 _config 相关字段及注释
   */
  static config(options={}){
    //自定义配置
    Object.assign(Navigator._config, options);
    Navigator._history.config({correctLevel: Navigator._config.MAX_LEVEL-2});

    wxPromise = customWxPromisify({overrides: Navigator._config.oriNavOverrides, dealFail: false});
    wxResolve = customWxPromisify({overrides: Navigator._config.oriNavOverrides, dealFail: true});
  }

  /**
   * 打开新页面
   * @param {Object} route 页面配置，格式同wx.navigateTo
   */
  @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
  static async navigateTo(route){
    console.log('[Navigator] navigateTo:', route);
    let curPages = getCurrentPages();
    Navigator._history.open({url: toAbsolutePath(route.url, curPages[curPages.length-1].route)});

    if (Navigator._config.enableCurtain && curPages.length == Navigator._config.MAX_LEVEL-1) { //空白中转策略：倒数第二层开最后一层时，先把倒二层换成空白页，再打开最后一层
      console.log('[Navigator] replace with curtain', 'time:', Date.now(), 'getCurrentPages:', getCurrentPages());
      Navigator._history.savePage(Navigator._history.length-2, curPages[curPages.length-1]); //保存页面数据
      await Navigator._secretReplace({url: Navigator._config.curtainPage});
      console.log('[Navigator] open from curtain', 'time:', Date.now(), 'getCurrentPages:', getCurrentPages());
      await Navigator._secretOpen(route);
    } else if (curPages.length < Navigator._config.MAX_LEVEL) { //层级未满，直接打开
      await Navigator._secretOpen(route);
    } else {  //层数已占满时，替换最后一层
      Navigator._history.savePage(Navigator._history.length-2, curPages[curPages.length-1]); //保存页面数据
      await Navigator._secretReplace(route);
    }
  }

  /**
   * 替换当前页面
   * @param {Object} route 页面配置，格式同wx.redirectTo
   */
  // @makeMutex({namespace:globalStore, mutexId:'redirect'}) //考虑到有些页面对特定入参会立马中转至其它页面，redirectTo不作免并发
  static async redirectTo(route){
    console.log('[Navigator] redirectTo:', route);
    let curPages = getCurrentPages();
    Navigator._history.replace({url: toAbsolutePath(route.url, curPages[curPages.length-1].route)});
    await Navigator._secretReplace(route);
  }



  /**
   * 返回
   * @param {Object} opts 返回配置，格式同wx.navigateBack
   */
  @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
  static async navigateBack(opts={delta:1}){
    console.log('[Navigator] navigateBack:', opts);
    await Navigator._doBack(opts, {sysBack: false});
  }

  @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
  static async reLaunch(route){
    console.log('[Navigator] reLaunch:', route);
    Navigator._activeUnload = true;
    await wxPromise.reLaunch(route);
    await delay(NAV_BUSY_REMAIN);
  }

  @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
  static async switchTab(route){
    console.log('[Navigator] switchTab:', route);
    Navigator._activeUnload = true;
    await wxPromise.switchTab(route);
    await delay(NAV_BUSY_REMAIN);
  }

  /**
   * 主动触发的页面卸载过程结束标记
   * 目前似乎无法监听接口主动触发的页面卸载过程什么时候结束：
   * 1. reLaunch、redirectTo等接口会立刻进行success回调，不会等待页面卸载、跳转完成再回调
   * 2. redirectTo到一个分包页面时，须等待分包加载完成，然后才发生页面卸载、跳转，过程耗时不可预估
   * 因而采取如下策略判断结束时机：从第一个页面卸载开始，若干延时后，认为该次操作触发的全部页面卸载过程结束
   * @return {Promise<void>}
   * @private
   */
  @noConcurrent
  static async _finishActiveUnload(){
    await delay(300); //reLaunch、switchTab等可能一次性触发多个onUnload，因而须等所有onUnload均触发完毕后才能将_activeUnload置回false
    Navigator._activeUnload = false;
  }

  /**
   * 监听页面卸载过程；本质是想监听用户的返回操作（点击物理返回键/左上角返回按钮），但似乎并没有相应接口，暂借助页面onUnload过程进行判断
   */
  static onPageUnload(){
    if (Navigator._activeUnload) {//调用接口主动进行页面卸载，此处不再重复处理
      Navigator._finishActiveUnload();
      return;
    }

    //用户点击了物理返回键/左上角返回按钮
    console.log('[Navigator] sysBack');
    Navigator._doBack({delta:1}, {sysBack: true});
  }

  /**
   * 完整历史记录
   * @return {Array}
   */
  static get history(){
    return Navigator._history.routes;
  }

  /**
   * 返回
   * @param {Object} opts 返回配置，格式同wx.navigateBack
   * @param {boolean} sysBack， 是否为系统返回： true-点击了物理返回键/左上角返回按钮，触发了系统返回行为；false-接口调用，返回逻辑完全由代码控制
   * @private
   */
  static async _doBack(opts, {sysBack}){
    let targetRoute = Navigator._history.back(opts);
    let curLength = getCurrentPages().length - (sysBack ? 1 : 0); //当前实际层级（系统返回无法取消，实际层级需要减1）

    console.log('[Navigator] doBack, hisLength:', Navigator._history.length, 'curLen:', curLength, 'targetRoute:', targetRoute);

    let targetCurtain = Navigator._config.enableCurtain && Navigator._history.length==Navigator._config.MAX_LEVEL-1; //目标页面是否为中转空白页（空白中转策略）
    let targetTainted = Navigator._config.enableTaintedRestore && targetRoute.tainted; //目标页面数据是否已被覆盖（wepy单页面实例问题）

    if (Navigator._history.length < curLength) {  //返回后逻辑层级<当前实际层级，则直接返回到目标层级（如 MAX+2 层调用 navigateBack({delta: 3}) )
      await Navigator._secretBack({
        delta: curLength-Navigator._history.length
      });

      if (targetCurtain) {//当前页为中转空白页（空白中转策略），则替换为目标页面
        await Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}});
        await Navigator._doLostRestore(targetRoute);
      } else if (targetTainted) { //若目标页面实例已被覆盖（wepy单页面实例问题），则进行数据恢复
        await Navigator._doTaintedRestore(targetRoute);
      }
    } else if (Navigator._history.length === curLength) { //返回后逻辑层级===当前实际层级
      if (!sysBack || targetCurtain) {//非系统返回 （如 MAX+1 层调用navigateBack()）或 当前页为中转空白页，则重定向至目标页面
        await Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}});
        await Navigator._doLostRestore(targetRoute);
      } else if (targetTainted){ //目标页面已被覆盖
        await Navigator._doTaintedRestore(targetRoute);
      }
      //否则，系统返回即符合预期，无需额外处理
    } else { //返回后逻辑层级 > 当前实际层级，则在最后一层载入目标页面 （如 MAX+5 层返回 MAX+4 层）
      await (sysBack ? Navigator._secretOpen(targetRoute, {extraParams: {_forcedRefresh: true}}) : Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}}));
      await Navigator._doLostRestore(targetRoute);
    }
  }

  /**
   * 不考虑历史记录问题，实际进行打开页面操作
   * @param route 页面参数
   * @param extraParams 向页面url额外拼接参数
   * @param retryAfter 若因webview层级错乱原因导致打开失败，则在指定毫秒后重试
   * @param retryTimeout 重试间隔大于指定毫秒时，判定打开失败，不再重试
   * @private
   */
  static async _secretOpen(route, {retryAfter=NAV_BUSY_REMAIN, retryTimeout=2000, extraParams=null}={}){
    console.log('[Navigator] _secretOpen', route);
    let openRes = await wxResolve.navigateTo(Object.assign({}, route, {success: null, fail: null, url: appendUrlParam(route.url, extraParams)}));

    //打开成功
    if (openRes.succeeded) {
      typeof route.success === "function" && route.success(openRes);
      await delay(NAV_BUSY_REMAIN);
      return;
    }

    //层级问题导致的打开失败
    if (openRes.errMsg.includes('limit exceed')) {
      //超出层级限制无法打开，改为替换当前页
      if (getCurrentPages().length >= Navigator._config.MAX_LEVEL) {
        return Navigator._secretReplace(route, {extraParams});
      }

      //异常报错，如：实践发现，重定向倒二层、打开最后一层 两个操作连续进行时，虽然层级实际并未超出限制，但在某些机型某些页面上仍会报层级问题
      if (retryAfter < retryTimeout) { //此时，重试几次，每次间隔时间递增
        console.warn('[Navigator] false limit alarm, retry after:', retryAfter, 'ms', route);
        await delay(retryAfter);
        return Navigator._secretOpen(route, {retryAfter: retryAfter*2, retryTimeout, extraParams});
      } else { //等待足够长的时间间隔后才重试依然失败，则打开失败
        console.error('[Navigator error] _secretOpen failed, res:', openRes, 'getCurrentPages:',getCurrentPages(), 'longest retry interval:', retryAfter/2);
        typeof route.fail === "function" && route.fail(openRes);
        throw openRes;
      }
    }

    //其它原因导致的打开失败
    typeof route.fail === "function" && route.fail(openRes);
    throw openRes;
  }

  /**
   * 不考虑历史记录问题，实际进行页面替换操作
   * @param route
   * @param extraParams 向页面url额外拼接参数
   * @private
   */
  static async _secretReplace(route, {extraParams=null}={}){
    console.log('[Navigator] _secretReplace', route);
    Navigator._activeUnload = true;
    await wxPromise.redirectTo(Object.assign({}, route, {url: appendUrlParam(route.url, extraParams)}));
    await delay(NAV_BUSY_REMAIN);
  }


  /**
   * 不考虑历史记录问题，实际进行页面返回操作
   * @param opts
   * @private
   */
  static async _secretBack(opts={delta:1}){
    console.log('[Navigator] _secretBack', opts);
    Navigator._activeUnload = true;
    await wxPromise.navigateBack(opts);
    await delay(globalStore.env.os=='ios' ? NAV_BUSY_REMAIN*3 : NAV_BUSY_REMAIN);
  }


  /**
   * 数据恢复：wepy实例覆盖问题，存在两级同路由页面时，前者数据会被后者覆盖，返回时予以恢复
   * 此时滚动位置等界面状态均正常，恢复数据即可
   * @param route
   * @return {Promise<void>}
   * @private
   */
  static async _doTaintedRestore(route){
    //若有自定义页面数据恢复机制，则尝试以自定义方式恢复数据
    let res = Navigator._config.pageRestoreHandler && Navigator._config.pageRestoreHandler({
      route,
      context: 'tainted'
    });

    if (res instanceof Promise)
      res = await res;

    if (res && res.succeeded)
      return;

    //若自定义恢复失败，则以刷新页面的方式恢复数据（不会保留表单数据和交互状态，但至少保证页面数据不错乱）
    await Navigator._secretReplace(route, {extraParams: {_forcedRefresh: true}});
  }

  /**
   * 数据恢复：层级过深，新开页面时会替换前一页面，导致前一页面数据丢失，返回时予以恢复
   * 此时页面处于刷新结束状态，表单数据和交互状态均需自行恢复
   * @param route
   * @return {Promise<void>}
   * @private
   */
  static async _doLostRestore(route){
    //若有自定义页面数据恢复机制，则尝试以自定义方式恢复数据
    Navigator._config.pageRestoreHandler && Navigator._config.pageRestoreHandler({
      route,
      context: 'unloaded'
    });

    //否则，页面保持刷新状态，暂不提供默认恢复机制
  }
}