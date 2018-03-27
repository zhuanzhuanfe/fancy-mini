import {delay, deepAssign} from './operationKit';

class Toast {
  _options = {
    icons: {
      success: '/images/tipsucc.png',
      fail: '/images/tipfail.png'
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

  constructor(options){
    deepAssign(this._options, options);
  }

  get installProps(){
    return this._options.installProps;
  }

  /**
   * toast
   * @param {Object} options {
   *  title: '',  //提示文案
   *  type: '',   //图标类型：'success' | 'fail'
   *  duration: 2000, //持续时长， 单位：ms
   * }
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
   * 使用微信系统toast，带图标，最多只能展示7个汉字
   * @param options 同toast函数
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
   * 使用微信系统toast，不带图标，最多展示两行
   * @param options 同toast函数
   */
  sysToastText = async (options)=>{
    if (!wx.setTabBarItem) //不带图标的toast从基础库1.9.0开始支持；wx.canIUse('showToast.object.icon.none')不好使，暂借用其它API来判断版本
      return this.sysToastModal(options);

    let title = options.title;
    if (!title.includes('\n')) { //折成字数相等的两行
      let mid = Math.ceil(title.length/2);
      title = title.substring(0, mid)+'\n'+title.substring(mid);
    }

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
   * 使用微信系统弹窗，可以展示大片文案
   * @param options 同toast函数
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

export default Toast;
