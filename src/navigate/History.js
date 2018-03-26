/**
 * 历史记录
 * 由于小程序只支持最多5级页面，但需求上希望维护更长的历史栈，故自行维护完整历史记录
 */
export default class History {
  _routes = []; //历史栈
  _correctLevel = -1; //自行维护的逻辑历史栈与系统实际历史栈的前若干项应当始终保持一致

  constructor({correctLevel=1, routes=[]}){
    this._routes = routes.slice(0);
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
   * @param {Object} route 页面配置
   */
  open(route){
    this.doCorrection();
    this._routes.push(Object.assign({}, route));
    this._checkTainted();
  }

  /**
   * 替换当前页
   * @param {Object} route 页面配置
   */
  replace(route){
    this.doCorrection();
    this._routes[this._routes.length-1] = Object.assign({}, route);
    this._checkTainted();
  }

  /**
   * 返回
   * @param {Number} delta 返回级数
   * @return {Object} 返回完成后所处的页面配置
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

    if (curPages[0] && !curPages[0].route) //低版本拿不到路径信息，不作校正处理
      return;

    if (curPages.length <= this._correctLevel) {
      let remainCorrect = this._routes.length===curPages.length && curPages.every((page, idx)=> isSamePage(fullUrl(page.route, page.options), this._routes[idx].url));
      if (!remainCorrect) {
        this._routes = curPages.map(page=>Object.assign(resetRoute({}), {url: fullUrl(page.route, page.options)}));
        this._checkTainted();
      }
    }
  }

  /**
   * 历史栈长度
   * @return {Number}
   */
  get length(){
    return this._routes.length;
  }

  /**
   * 当前页面配置
   * @return {*}
   */
  get curRoute(){
    if (this._routes.length == 0) {
      return {};
    }

    return Object.assign({}, this._routes[this._routes.length-1]);
  }

  /**
   * 完整历史记录
   * @return {Array}
   */
  get routes(){
    this.doCorrection();
    return this._routes.slice(0);
  }
}

/**
 * 将路径和参数拼成完整url
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
 * @param url1
 * @param url2
 * @return {boolean}
 */
function isSamePage(url1='', url2='') {
  return url1.split('?')[0] === url2.split('?')[0];
}

/**
 * 重置路由对象
 * @param route
 */
function resetRoute(route={}) {
  route.url = '';
  route.tainted = false;
  return route;
}
