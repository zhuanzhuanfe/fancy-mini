import {deepClone} from '../operationKit';

/**
 * 历史记录
 * 由于小程序只支持最多10级页面，但需求上希望维护更长的历史栈，故自行维护完整历史记录
 */
class History {
  _routes = []; //历史栈
  _correctLevel = 8; //自行维护的逻辑历史栈与系统实际历史栈的前若干项应当始终保持一致

  /**
   * 构造函数
   * @param {Array<History~Route>} routes 初始路由栈
   */
  constructor({routes=[]}){
    this._routes = routes.slice(0);
  }

  /**
   * 配置
   * @param {number} correctLevel 自行维护的逻辑历史栈与系统实际历史栈的前多少项应当始终保持一致，用于校正代码疏漏和系统交互造成的逻辑历史栈失真
   */
  config({correctLevel=8}={}){
    this._correctLevel = correctLevel;
  }

  /**
   * wepy框架存在单实例问题，同一路径页面被打开两次时，其数据会相互影响,，如：详情页A - 详情页B - 返回A，点击查看大图 - B的图片（而不是A的图片）
   * 故需检查历史页面实例是否已被覆盖，若已被覆盖，则返回时需手动刷新
   * @private
   */
  _checkTainted(){
    for (let i=0; i<this._routes.length; ++i) {
      if (this._routes[i].tainted)
        continue;

      let tainted = false;
      for (let j=i+1; j<this._routes.length; ++j) {
        if (isSamePage(this._routes[i].url, this._routes[j].url)) { //判断页面实例是否被后续实例覆盖
          tainted = true;
          break;
        }
      }
      this._routes[i].tainted = tainted;
    }
  }

  /**
   * 打开新页面
   * @param {History~Route} route 新页面
   */
  open(route){
    this.doCorrection();
    this._routes.push(Object.assign({}, route));
    this._checkTainted();
  }

  /**
   * 替换当前页
   * @param {History~Route} route 替换成哪个页面
   */
  replace(route){
    this.doCorrection();
    this._routes[this._routes.length-1] = Object.assign({}, route);
    this._checkTainted();
  }

  /**
   * 返回
   * @param {Number} delta 返回级数
   * @return {History~Route} 返回完成后所处的页面
   */
  back({delta=1}={}){
    this.doCorrection();
    this._routes.length = Math.max(this._routes.length-delta, 0);
    return this.curRoute;
  }

  /**
   * 根据系统历史栈校正本地维护的历史记录
   * 考虑到实际路由场景过于复杂，故定期校正以增强健壮性，如：点击右上角主页按钮、退出后又点击另一个分享链接、页面未使用封装接口等
   */
  doCorrection(){
    let curPages = getCurrentPages();

    if (curPages.length <= this._correctLevel) {
      let remainCorrect = this._routes.length===curPages.length && curPages.every((page, idx)=> isSamePage(fullUrl(page.route||page.__route__, page.options), this._routes[idx].url));
      if (!remainCorrect) {
        this._routes = curPages.map(page=>Object.assign(resetRoute({}), {url: fullUrl(page.route||page.__route__, page.options)}));
        this._checkTainted();
      }
    }
  }

  /**
   * 保存页面数据
   * @param {number} idx 路由栈下标
   * @param wxPage 对应的原生页面实例
   */
  savePage(idx, wxPage){
    this._routes[idx].wxPage = wxPage;
  }

  /**
   * 获取路由
   * @param {number} idx 路由栈下标
   * @return {History~Route} 对应的页面
   */
  getRoute(idx){
    if (!(idx>=0 && idx<this._routes.length))
      return resetRoute({});

    let route = deepClone(this._routes[idx]);
    if (idx+1<=this._correctLevel)
      route.wxPage = getCurrentPages()[idx];

    return route;
  }

  /**
   * 历史栈长度
   * @return {number}
   */
  get length(){
    return this._routes.length;
  }

  /**
   * 当前页面
   * @return {History~Route}
   */
  get curRoute(){
    return this.getRoute(this._routes.length-1);
  }

  /**
   * 完整历史记录
   * @return {Array<History~Route>}
   */
  get routes(){
    this.doCorrection();
    return this._routes.map((val, idx)=>this.getRoute(idx));
  }

  /**
   * 自行维护的逻辑历史栈与系统实际历史栈应当始终保持一致的层数
   * @return {number}
   */
  get correctLevel(){
    return this._correctLevel;
  }
}

/**
 * 将路径和参数拼成完整url
 * @ignore
 * @param path  路径
 * @param options 参数
 * @return {string} url
 */
function fullUrl(path='', options={}) {
  let url = path[0]==='/' ? path : '/'+path;
  let params = [];
  for (let name in options) {
    params.push(name+'='+options[name]);
  }
  url += params.length > 0 ? '?' : '';
  url += params.join('&');
  return url;
}

/**
 * 判断两个url是否为同一个页面的实例
 * @ignore
 * @param url1
 * @param url2
 * @return {boolean}
 */
function isSamePage(url1='', url2='') {
  return url1.split('?')[0] === url2.split('?')[0];
}

/**
 * 重置路由对象
 * @ignore
 * @param route
 */
function resetRoute(route={}) {
  route.url = '';
  route.tainted = false;
  return route;
}

/**
 * @typedef {object} History~Route 路由对象
 * @property {string} url 页面完整路径，e.g. '/pages/index/index?param1=1'
 * @property {boolean} [tainted] 实例数据是否已被污染，详见[实例覆盖自动恢复功能]{@link https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.2-navigate.html#taintedRestore}
 * @property  [wxPage] 对应的微信原生页面实例，恢复页面数据时使用，使用场景：1.[实例覆盖自动恢复功能]{@link https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.2-navigate.html#taintedRestore} 2.层级过深时，新开页面会替换前一页面，导致前一页面数据丢失，返回时需予以恢复
 */

export default History;