import {deepEqual} from './operationKit';
/**
 * 用于页面间传递参数
 * 场景一：
 *    后一页面返回数据给前一页面，如：A页面-点击“选择地址”-地址页-选择完毕返回A页面，此时需将选择结果传给A页面
 * 场景二：
 *    前一页面传递参数给后一页面，一般直接在url中加参数即可，但若数据复杂，亦可考虑使用此数据对象进行传递
 * 利用ES6导出的是符号连接特性，不同页面引入的是同一实例，A页面对数据进行操作，B页面即时生效，因而可当作全局数据对象使用
 * 相比于使用storage传参，此方式为内存操作，即时性更强，效率更高
 * 相比于直接调用前一页面的指定成员方法，此方式更通用，页面间耦合性更低
 */
class RouteParams
{
  _backFromRoute = '';  //后一页面（backFrom）路由
  _backFromData = '';   //后一页面传递给前一页面的数据
  _backFromHistoryStack = []; //后一页面路由栈，用于校验层级关系，避免backFrom数据未及时清理，对其它页面造成持续干扰

  _openFromRoute = '';  //前一页面（openFrom）路由
  _openFromData = '';   //前一页面传递给后一页面的数据
  _openFromHistoryStack = []; //前一页面路由栈，用于校验层级关系，避免openFrom数据未及时清理，对其它页面造成持续干扰

  static _getHistorySnapShot(history=getCurrentPages()){
    return history.map(page=>page.route);
  }

  /**
   * 后一页面向前一页面传递数据
   * @param {*} data  数据内容
   */
  setBackFromData(data){
    let history = getCurrentPages();
    let curPage = history[history.length-1];
    this._backFromRoute = curPage.route || curPage.__route__;
    this._backFromData = data;
    this._backFromHistoryStack = RouteParams._getHistorySnapShot(history);
  }

  /**
   * 返回前一页面时，获取后一页面的页面路径
   * @return {string} 后一页面页面路径
   */
  getBackFromRoute(){
    let curStack = RouteParams._getHistorySnapShot();
    if (!(curStack.length===this._backFromHistoryStack.length-1 && deepEqual(curStack, this._backFromHistoryStack.slice(0,-1)))) //路由栈不匹配，说明此为n久前其它页面遗留数据，应予以清理
      this.clearBackFrom();

    return this._backFromRoute;
  }
  /**
   * 返回前一页面时，获取后一页面传递过来的数据
   * @return {string} 后一页面传递过来的数据
   */
  getBackFromData(){
    let curStack = RouteParams._getHistorySnapShot();
    if (!(curStack.length===this._backFromHistoryStack.length-1 && deepEqual(curStack, this._backFromHistoryStack.slice(0,-1)))) //路由栈不匹配，说明此为n久前其它页面遗留数据，应予以清理
      this.clearBackFrom();

    return this._backFromData;
  }
  /**
   * 清除后一页面向前一页面的传递内容
   */
  clearBackFrom(){
    this._backFromRoute = '';
    this._backFromData = '';
  }

  /**
   * 前一页面向后一页面传递数据
   * @param {*} data  数据内容
   */
  setOpenFromData(data){
    let history = getCurrentPages();
    let curPage = history[history.length-1];
    this._openFromRoute = curPage.route || curPage.__route__;
    this._openFromData = data;
    this._openFromHistoryStack = RouteParams._getHistorySnapShot(history);
  }
  /**
   * 进到后一页面时，获取前一页面的页面路径
   * @return {string} 前一页面页面路径
   */
  getOpenFromRoute(){
    let curStack = RouteParams._getHistorySnapShot();
    let hisMatch = (curStack.length===this._openFromHistoryStack.length+1 && deepEqual(curStack.slice(0,-1), this._openFromHistoryStack)) ||         //navigateTo
      (curStack.length===this._openFromHistoryStack.length && deepEqual(curStack.slice(0,-1), this._openFromHistoryStack.slice(0,-1)));  //redirectTo
    if (!hisMatch) //路由栈不匹配，说明此为n久前其它页面遗留数据，应予以清理
      this.clearOpenFrom();

    return this._openFromRoute;
  }
  /**
   * 进到后一页面时，获取前一页面传递过来的数据
   * @return {string} 前一页面传递过来的数据
   */
  getOpenFromData(){
    let curStack = RouteParams._getHistorySnapShot();
    let hisMatch = (curStack.length===this._openFromHistoryStack.length+1 && deepEqual(curStack.slice(0,-1), this._openFromHistoryStack)) ||         //navigateTo
      (curStack.length===this._openFromHistoryStack.length && deepEqual(curStack.slice(0,-1), this._openFromHistoryStack.slice(0,-1)));  //redirectTo
    if (!hisMatch) //路由栈不匹配，说明此为n久前其它页面遗留数据，应予以清理
      this.clearOpenFrom();

    return this._openFromData;
  }
  /**
   * 清除前一页面向后一页面的传递内容
   */
  clearOpenFrom(){
    this._openFromRoute = '';
    this._openFromData = '';
  }
}

export default new RouteParams();
