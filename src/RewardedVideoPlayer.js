import {singleAisle, errSafe} from './decorators';
import {ctxDependConsole as debugConsole} from './debugKit';

/**
 * 激励视频播放器，封装激励视频加载、播放时序
 * 使用：
 * 1. 初始化：this.rewardedVideoPlayer = new RewardedVideoPlayer({adUnitId: '广告位id'})
 * 2. 监听页面onShow: onShow(){ this.rewardedVideoPlayer.handlePageChange() };
 * 3. 播放视频：
        let playRes = await this.rewardedVideoPlayer.play();
        if (playRes.code !== 0) { //播放异常（微信版本过低/视频加载失败/其它异常情况）
          wx.showToast({ title: playRes.errMsg })
        } else if (!playRes.isEnded) { //用户提前关闭视频
          ;
        } else { //正常完整观看
          ;
        }
 * 更多用法详见各函数注释
 */
export default class RewardedVideoPlayer {
  _adUnitId = ''; //广告位id
  
  _rewardedVideo = null; //原生视频实例
  _loadStateValue = 'notStart'; //视频加载状态：notStart-未开始 | notSupport-版本过低不支持 |  loading-加载中 | failed-加载失败 | loaded-加载成功
  _playStateValue = 'idle'; //视频播放状态：idle-空闲中 | playing-播放中 | aborted-中途退出 | ended-播放完毕
  
  _loadStateChangeListeners = []; //加载状态监听列表

  /**
   * 构造函数
   * @param {string} adUnitId 广告位id
   */
  constructor({adUnitId}){
    this._adUnitId = adUnitId;
    this._init();
  }

  _init(){
    if (!wx.createRewardedVideoAd) {
      this._rewardedVideo = null;
      this._loadState = 'notSupport';
      this._playState = 'idle';
      return;
    }

    this._rewardedVideo = wx.createRewardedVideoAd({
      adUnitId: this._adUnitId
    });
    
    this._rewardedVideo.onError((e)=>{
      console.error('[rewardedVideoPlayer] error:', e);
      this._loadState==='loading' && (this._loadState = 'failed');
      this._playState==='playing' && (this._playState = 'failed');
    });
    
    this._loadState = 'notStart';
    this._playState = 'idle';
  }

  /**
   * 切换页面时原生视频实例失效，故每次onShow需重新初始化
   * @param {boolean} preload 是否需要预加载视频：true-开始预加载 | false-不进行预加载（后续可手动调用load()决定加载时机）
   */
  handlePageChange({preload=true}={}){
    debugConsole.log('[rewardedVideoPlayer] enter handlePageChange');
    if (this._playState === 'playing') //点击广告链接跳转其它小程序返回造成的onShow
      return;

    debugConsole.log('[rewardedVideoPlayer] re init');
    this._init();
    preload && this.load();
  }
  
  /**
   * 开始加载视频
   * @param {boolean} reset 是否需要重置：true-强制重新加载 | false-可复用已有视频
   */
  @singleAisle
  @errSafe
  async load({reset=false}={}){
    debugConsole.log('[rewardedVideoPlayer] enter load');
    if (!this._rewardedVideo)
      return {succeeded: false};
    
    if (this._loadState==='loaded' && !reset)
      return {succeeded: true};
    
    this._loadState = 'loading';

    debugConsole.log('[rewardedVideoPlayer] begin load');
    let loadRes = await new Promise((resolve,reject)=>{
      this._rewardedVideo.load().then(()=>{
        resolve({succeeded: true});
      }).catch((e)=>{
        console.error('[rewardedVideoPlayer] load failed, exception:', e);
        resolve({succeeded: false});
      });
    });

    debugConsole.log('[rewardedVideoPlayer] finish load, res:', loadRes);
    this._loadState = loadRes.succeeded ? 'loaded' : 'failed';
    return {succeeded: loadRes.succeeded};
  }

  /**
   * 开始播放视频
   * @return {Promise<Object>} 播放结果 {
        code: 0, //是否正常：0-正常播放，其它-播放异常（微信版本过低/视频加载失败/其它异常情况）
        errMsg: '', //异常提示信息
        isEnded: true, //（正常时）是否观看完整
   * }
   */
  @errSafe
  async play(){
    debugConsole.log('[rewardedVideoPlayer] enter play');
    //低版本兼容
    if (!this._rewardedVideo)
      return {code: -1, errMsg: '您的微信版本较低，不支持此功能', isEnded: false};
    
    //加载视频
    if (this._loadState !== 'loaded'){
      wx.showLoading({
        title: '视频加载中'
      });
      
      await this.load();
      
      wx.hideLoading();
      
      if (this._loadState !== 'loaded')
        return {code: -2, errMsg: '没有更多视频了', isEnded: false};
    }

    //播放视频
    debugConsole.log('[rewardedVideoPlayer] begin play');
    this._playState = 'playing';
    let playRes = await new Promise((resolve, reject)=>{
      let closeHandler = (status)=>{
        let isEnded = (status && status.isEnded || status === undefined);
        this._rewardedVideo.offClose(closeHandler);
        resolve({code: 0, isEnded, errMsg: 'ok'});
      };
      this._rewardedVideo.onClose(closeHandler);
      this._rewardedVideo.show().catch((e)=>{
        console.error('[rewardedVideoPlayer] play failed, exception:', e);
        resolve({code: -3, errMsg: '播放异常', isEnded: false});
      });
    });

    debugConsole.log('[rewardedVideoPlayer] finish play, res:', playRes);
    //结果处理
    this._playState = playRes.code===0&&playRes.isEnded ? 'ended' : 'aborted';
    this.load({reset: true}); //开始后台加载下一个视频（不管播没播完，都需要重新加载）
    
    return playRes;
  }

  /**
   * 监听加载状态变化，用于展示/隐藏入口等
   * @param {Function} handler 监听函数，入参：{
       state:'loaded', //加载状态，可选值及语义参见_loadStateValue定义处注释
      }
   */
  onLoadStateChange(handler){
    if (typeof handler !== 'function')
      return;
    
    handler({state: this._loadState});
    this._loadStateChangeListeners.push(handler);
  }

  /**
   * 获取当前加载状态（只读）
   */
  get loadState(){ //供外部调用，只读
    return this._loadStateValue;
  }
  get _loadState(){ //内部使用，可读可写
    return this._loadStateValue;
  }
  set _loadState(newState){ //内部使用，可读可写
    if (this._loadState === newState)
      return;
    
    this._loadStateValue = newState;
    this._loadStateChangeListeners.forEach(listener=>listener({state: newState}));
  }
  get _playState(){
    return this._playStateValue;
  }
  set _playState(newState){
    this._playStateValue = newState;
  }
}
