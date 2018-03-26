/**
 * 重载wx的部分接口，用法与wx一致，只是功能做了一些额外处理
 * 使用示例：
 * import {wxRefine} from '../../lib/wxPromise';
 *
 * onBtn(){
 *    wxRefine.navigateTo({url: ''}); //功能同wx.navigateTo，只是额外做了防并发处理和超层数限制处理
 * }
 */
import Navigator from './navigate/Navigator';

export const wxRefine = (function () {
  let wxRefine = {
    navigateTo: Navigator.navigateTo,
    redirectTo: Navigator.redirectTo,
    navigateBack: Navigator.navigateBack,
  };
  return Object.assign({}, wx, wxRefine);
}());


/**
 * 小程序API的Promise封装，用法与wx一致，只是返回结果为Promise形式
 * 示例：
 *  async func(){
 *    let imgInfo = await wxPromise.getImageInfo({src: 'https://xxx'}); //调用wx.getImageInfo，并在success回调中resolve
 *    console.log(imgInfo.width); //打印图片信息
 *  }
 */
export const wxPromise = promisify(wxRefine, {dealFail: false});

/**
 *同wxPromise，差别在于wxPromise在成功时resolve，失败时reject，而wxResolve不管成功失败都会resolve，便于手动处理异常情形
 */
export const wxResolve = promisify(wxRefine, {dealFail: true});

function promisify(callbackSdk, {dealFail=false}) {
  let promiseSdk = {};
  for (let key in callbackSdk) {
    if (typeof callbackSdk[key] !== "function" || /[^a]sync$/i.test(key)) {
      promiseSdk[key] = callbackSdk[key];
      continue;
    }

    promiseSdk[key] = function (options={}) {
      return new Promise((resolve, reject)=>{
        return callbackSdk[key](Object.assign({}, options, {
          success(res){
            Object.assign(res, {succeeded: true});
            options.success && options.success(res);
            resolve(res);
          },
          fail(res){
            Object.assign(res, {succeeded: false});
            options.fail && options.fail(res);
            dealFail ? resolve(res) : reject(res);
          },
        }));
      });
    }
  }
  return promiseSdk;
}
