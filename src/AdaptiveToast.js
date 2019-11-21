import {delay, deepAssign} from './operationKit';

/**
 * 自适应的toast
 * 处理原生toast截断问题，详见{@tutorial 3.1-adaptiveToast}
 */
class AdaptiveToast {
  _options = {
    icons: {
      success: '/images/toast/success.png',
      fail: '/images/toast/fail.png'
    },
    defaultOpts: {
      title: '',
      type: 'fail',
      duration: 2000,
    },
    installProps: {
      '$toast': 'toast'
    }
  };

  /**
   * 构造函数
   * @param {object} [options] 配置参数
   * @param {Object.<string, string>} [options.icons={success: '/images/toast/success.png',fail: '/images/toast/fail.png'}] 图标映射表，key为调用方指定的toast场景类型，value为对应的图标路径
   * @param {AdaptiveToast~ToastOptions} [options.defaultOpts={title: '',type: 'fail',duration: 2000}] toast的默认选项
   */
  constructor(options){
    deepAssign(this._options, options);
  }

  /**
   * @ignore
   */
  get installProps(){
    return this._options.installProps;
  }

  /**
   * 自适应的toast，会自动根据文案长度选择合适的提示方式
   * @function
   * @async
   * @param {AdaptiveToast~ToastOptions} options toast参数
   */
  toast = async (options)=>{
    options = Object.assign({}, this._options.defaultOpts, options);

    let len = options.title.length;
    if (len <= 7) //文案简洁，使用带图标的toast
      return this.sysToastIcon(options);
    else if (len <= 20) //文案较长，使用长文本toast
      return this.sysToastText(options);
    else //文案巨长，改用弹窗
      return this.sysToastModal(options);
  }
  
  /**
   * 文案较少时使用的toast，带图标，最多只能展示7个汉字
   * @function
   * @async
   * @param {AdaptiveToast~ToastOptions} options toast参数
   */
  sysToastIcon = async (options)=>{
    wx.showToast({
      title: options.title,
      image: this._options.icons[options.type] || options.type,
      duration: options.duration,
      success : options.success,
      fail:options.fail,
      complete:options.complete
    });
    await delay(options.duration);
  }
  
  /**
   * 文案中等长度时使用的toast，不带图标，最多展示两行
   * @function
   * @async
   * @param {AdaptiveToast~ToastOptions} options toast参数
   */
  sysToastText = async (options)=>{
    if (!wx.setTabBarItem) //不带图标的toast从基础库1.9.0开始支持；wx.canIUse('showToast.object.icon.none')不好使，暂借用其它API来判断版本
      return this.sysToastModal(options);

    let title = options.title;
    /*if (!title.includes('\n')) { //折成字数相等的两行 （安卓机下有时第一行会变成'...'不能正常展示，且与内容编码无关，纯英文字符串亦可复现；原因不明，暂去掉自动换行逻辑）
      let mid = Math.ceil(title.length/2);
      title = title.substring(0, mid)+'\n'+title.substring(mid);
    }*/

    wx.showToast({
      title,
      icon: 'none',
      duration: options.duration,
      success : options.success,
      fail:options.fail,
      complete:options.complete
    });
    await delay(options.duration);
  }
  
  /**
   * 文案巨长时使用的toast，自动改用系统弹窗
   * @function
   * @async
   * @param {AdaptiveToast~ToastOptions} options toast参数
   */
  sysToastModal = async (options)=>{
    return new Promise((resolve, reject)=>{
      wx.showModal({
        title: '提示',
        content: options.title,
        showCancel: false,
        confirmText: '知道了',
        success : options.success,
        fail:options.fail,
        complete: (...args)=>{
          options.complete && options.complete(...args);
          resolve();
        }
      });
    })
  }
}

/**
 * @typedef {object} AdaptiveToast~ToastOptions toast参数
 * @property {string} title toast文案
 * @property {string} [type] toast场景类型
 * @property {number} [duration] toast时长，单位：ms
 */

export default AdaptiveToast;
