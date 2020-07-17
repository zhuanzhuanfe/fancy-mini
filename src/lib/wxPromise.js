/**
 * 将微信原生api封装为Promise形式使用
 * @module wxPromise
 */

/**
 * 小程序API的Promise封装，用法与wx一致，只是返回结果为Promise形式
 * @example
 async func(){
     let imgInfo = await wxPromise.getImageInfo({src: 'https://xxx'}); //调用wx.getImageInfo，并在success回调中resolve
     console.log(imgInfo.width); //打印图片信息
 }
 */
export const wxPromise = promisify(wx, {dealFail: false});

/**
 *同wxPromise，差别在于wxPromise在成功时resolve，失败时reject，而wxResolve不管成功失败都会resolve，便于手动处理异常情形
 * 会在返回结果中额外添加succeeded字段，用于区分成功失败
 * @example
 async func(){
    let copyRes = await wxResolve.setClipboardData({ data: 'hello'});  //复制到剪贴板

    this.$toast({  //成功失败均予以提示
      title: copyRes.succeeded ? '复制成功' : '复制失败',
      type: copyRes.succeeded ? 'success' : 'fail',
    });
 }
 */
export const wxResolve = promisify(wx, {dealFail: true});

/**
 * 自定义Promise化方式
 * @param {Object} overrides  自定义覆盖wx的部分接口
 * @param {boolean} dealFail   true - 失败时也resolve，并标记res.succeeded=false； false - 失败时直接reject
 * @return {Object}  Promise化的wx
 * @example
 * const wxPromise = customWxPromisify({
 *  overrides: { //部分api不直接使用wx，而是添加一些自定义逻辑
 *    navigateTo(options){
 *      console.log('custom navigateTo');
 *      wx.navigateTo(options);
 *    },
 *    request(options){
 *      console.log('custom request');
 *      wx.request(options);
 *    },
 *  },
 *  dealFail: false, //触发fail回调时，reject对应的Promise
 * });
 * let imgInfo = await wxPromise.getImageInfo({src: 'https://xxx'}); 
 console.log(imgInfo.width); //以Promise形式获取wx.getImageInfo返回结果
 * 
 * const wxResolve = customWxPromisify({
 *  overrides: { //部分api不直接使用wx，而是添加一些自定义逻辑
 *    navigateTo(options){
 *      console.log('custom navigateTo');
 *      wx.navigateTo(options);
 *    },
 *    request(options){
 *      console.log('custom request');
 *      wx.request(options);
 *    },
 *  },
 *  dealFail: true, //触发fail回调时，依然resolve对应的Promise，并在返回结果中添加succeeded字段标记成功失败
 * });
 * let copyRes = await wxResolve.setClipboardData({ data: 'hello'});
 * console.log(copyRes.succeeded ? '复制成功' : '复制失败'); //以Promise形式获取wx.setClipboardData返回结果，成功失败以succeeded字段区分
 */
export function customWxPromisify({overrides={}, dealFail=false}={}) {
  //修复wx下有些方法在小程序单页模式下枚举报错的问题
  Object.keys(wx).forEach((key) =>{
    try {
      if(wx[key]) {}
    }catch(e) {
      Object.defineProperty(wx,key,{
        enumerable:false
      });
    }
  })
  let wxRefine = Object.assign({}, wx, overrides);
  return promisify(wxRefine, {dealFail});
}

function promisify(callbackSdk, {dealFail=false}) {
  let promiseSdk = {};
  for (let key in callbackSdk) {
    try {
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
    }catch(e) {
      console.error('[error]promisify出错: ',e);
      continue;
    }
  }
  return promiseSdk;
}
