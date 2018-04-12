import History from './History';
import {makeMutex} from '../decorator/noConcurrent';
import {ctxDependConsole as console} from '../debugKit';
import {delay, appendUrlParam} from '../operationKit';
import {wxPromise,wxResolve} from '../wxPromise';

const MAX_LEVEL = 10; //小程序支持打开的页面层数
const NAV_BUSY_REMAIN = 300;  //实践发现，navigateTo成功回调之后页面也并未完全完成跳转，故将跳转状态短暂延长，单位：ms

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
    curtainPage: '/pages/curtain/curtain',  //空白中转页，避免自定义返回行为时出现原生上一层级内容一闪而过的现象
    enableCurtain: true, //是否开启空白中转策略
    enableTaintedRefresh: true, //是否开启实例覆盖自动刷新策略
  };
  static _history = new History({routes: [{url:''}], correctLevel: MAX_LEVEL-2}); //完整历史栈
  static _activeUnload = false;   //是否为主动触发的页面卸载： true-代码主动调用导致； false-用户点击了物理返回键/左上角返回按钮导致

  /**
   * 安装
   * @param {Object} options 自定义配置，可配置项参见 _config 相关字段及注释
   */
  static config(options={}){
    //自定义配置
    Object.assign(Navigator._config, options);
  }

  /**
   * 打开新页面
   * @param {Object} route 页面配置，格式同wx.navigateTo
   */
  @makeMutex({namespace:globalStore, mutexId:'navigate'}) //避免跳转相关函数并发执行
  static async navigateTo(route){
    console.log('[Navigator] navigateTo:', route);
    Navigator._history.open({url: route.url});

    let curPages = getCurrentPages();
    if (Navigator._config.enableCurtain && curPages.length == MAX_LEVEL-1) { //空白中转策略：倒数第二层开最后一层时，先把倒二层换成空白页，再打开最后一层
      console.log('[Navigator] replace with curtain', 'time:', Date.now(), 'getCurrentPages:', getCurrentPages());
      await Navigator._secretReplace({url: Navigator._config.curtainPage});
      console.log('[Navigator] open from curtain', 'time:', Date.now(), 'getCurrentPages:', getCurrentPages());
      await Navigator._secretOpen(route);
    } else if (curPages.length < MAX_LEVEL) { //层级未满，直接打开
      await Navigator._secretOpen(route);
    } else {  //层数已占满时，替换最后一层
      await Navigator._secretReplace(route);
    }
  }

  /**
   * 替换当前页面
   * @param {Object} route 页面配置，格式同wx.redirectTo
   */
  @makeMutex({namespace:globalStore, mutexId:'redirect'}) //避免跳转相关函数并发执行（考虑到有些页面对特定入参会立马中转至其它页面，redirectTo不与navigateTo互斥）
  static async redirectTo(route){
    console.log('[Navigator] redirectTo:', route);
    Navigator._history.replace({url: route.url});
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
  /**
   * 监听页面卸载过程；本质是想监听用户的返回操作（点击物理返回键/左上角返回按钮），但似乎并没有相应接口，暂借助页面onUnload过程进行判断
   */
  static onPageUnload(){
    if (Navigator._activeUnload) {//调用接口主动进行页面返回，此处不再重复处理
      Navigator._activeUnload = false;
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
    if (Navigator._history.length < curLength) {  //返回后逻辑层级<当前实际层级，则直接返回到目标层级
      await Navigator._secretBack({
        delta: curLength-Navigator._history.length
      });

      if ((Navigator._config.enableTaintedRefresh && targetRoute.tainted) || //若目标页面实例已被覆盖（wepy单页面实例问题）
        (Navigator._config.enableCurtain && Navigator._history.length==MAX_LEVEL-1)) //或 当前页为中转空白页（空白中转策略）
      {
        await Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}}); //则刷新
      }
    } else if (Navigator._history.length === curLength) { //返回后逻辑层级===当前实际层级
      if (!sysBack || //非系统返回
        (Navigator._config.enableCurtain && curLength==MAX_LEVEL-1) || //或 当前页为中转空白页
        (Navigator._config.enableTaintedRefresh && targetRoute.tainted)) //或 目标页面已被覆盖
      { //则重定向至目标页面；否则，系统返回即符合预期，无需额外处理
        await Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}});
      }
    } else { //返回后逻辑层级 > 当前实际层级，则在最后一层载入目标页面
      await (sysBack ? Navigator._secretOpen(targetRoute, {extraParams: {_forcedRefresh: true}}) : Navigator._secretReplace(targetRoute, {extraParams: {_forcedRefresh: true}}));
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
      if (getCurrentPages().length >= MAX_LEVEL) {
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
}