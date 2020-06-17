/**
 * 倒计时模块
 * @param {Object} obj - 必填项，以对象字面量形式传参
 * @param {Number} obj.countFromInMs - 倒计时开始时的剩余时间，单位ms
 * @param {Function} obj.onTimeout - 倒计时结束时执行的回调函数
 * @param {Function} obj.onTimeChange - 每隔interval时间触发一次的回调函数，参数
 * @param {Number} obj.interval - 每间隔interval毫秒计算一次剩余时间，计算结果通过onTimeChange函数*入参传给调用方
 * @example: 
 *      var countdowner = new Countdowner({
 *         countFromInMs: 1000*60*60*24,  // 倒计时一小时
 *         onTimeChange: (res)=>{
 *          // 100ms执行一次，输出格式：[几天,几时,几分,几秒,几个（interval毫秒）]
 *          console.log(res.currentTimeArr);  // [00, 23, 59, 59, 9]
 *          console.log(res.currentTimeArrWithoutDay);  // [35, 23, 23, 23]
 *         },
 *         onTimeout: ()=>{
 *         },
 *         interval: 100 // 100ms输出一次当前时间
 *      }); 
 * 进阶用法：
 * 1、初始化完成后可通过实例绑定/解绑多个事件处理函数
 * countdowner.on('timechange/timeout', fn);
 * countdowner.off('timechange/timeout', fn);
 * 2、暂停/重启，countdowner.pause()/countdowner.restart();
 */
 export default class Countdowner {
  constructor({countFromInMs, onTimeChange, onTimeout, interval=1000}){
    if(onTimeout !== undefined)this.on('timeout', onTimeout);
    if(onTimeChange !== undefined)this.on('timechange', onTimeChange);
    if(countFromInMs !== undefined){
      countFromInMs = Number(countFromInMs);
      this.remainMs = this.countFromInMs = countFromInMs;
      this.deadline = Date.now() + countFromInMs;
      this.interval = interval;
      clearTimeout(this.timer);
      Countdowner.ticktock.call(this);
    }
  }

  timer = null;
  deadline = undefined;
  interval = 100;
  remainMs = undefined;
  isPause = false;
  pauseTime = undefined;
  eventsHandler = {
    timeout: [],
    timechange: []
  };

  on(eventName, fn){
    if(eventName != 'timeout' && eventName != 'timechange'){
      console.error('仅支持timeout和timechange事件');
      return;
    }
    this.eventsHandler[eventName].push(fn);
  }

  off(eventName, fn){
    if(eventName != 'timeout' && eventName != 'timechange'){
      console.error('仅支持timeout和timechange事件');
      return;
    }
    let index = this.eventsHandler[eventName].indexOf(fn);
    if(index > -1)this.eventsHandler[eventName].splice(index, 1);
  }

  pause({strict=true}){
    this.pauseTime = Date.now();
    this.strictPause = strict;
    this.isPause = true;
  }

  restart(){
    this.isPause = false;
    Countdowner.ticktock.call(this);
  }

  static onTimeout(){
    this.eventsHandler.timeout.forEach(fn => {
      typeof fn === 'function' && fn();
    })
  }

  static onTimeChange(timeSnapshot){
    this.eventsHandler.timechange.forEach(fn => {
      typeof fn === 'function' && fn(timeSnapshot);
    })
  }

  static async ticktock(){
    if (this.remainMs<=0) {
      this.countFromInMs>0 && Countdowner.onTimeout.call(this);
      return;
    }
    await new Promise((resolve, reject)=>{
      this.timer = setTimeout(resolve, this.interval);
    });

    // 如果使用了暂停功能，从暂停时间开始计算剩余时间
    let limit = Date.now();
    if(this.pauseTime && this.strictPause){
      limit = this.pauseTime;
      this.pauseTime += this.interval;
    }
    this.remainMs = Math.max(0, this.deadline - limit);

    let timeSnapshot = [
      this.remainMs / DAY,
      this.remainMs % DAY / HOUR,
      this.remainMs % HOUR / MINUTE,
      this.remainMs % MINUTE / SECOND,
      this.remainMs % SECOND / this.interval
    ].map(Math.floor).map((num,idx,arr)=>(padStart(num, 2, '0')));

    let timeSnapshotWithoutDay = [
      this.remainMs / HOUR,
      this.remainMs % HOUR / MINUTE,
      this.remainMs % MINUTE / SECOND,
      this.remainMs % SECOND / this.interval
    ].map(Math.floor).map((num,idx,arr)=>(padStart(num, 2, '0')));
    
    Countdowner.onTimeChange.call(this, {
      currentTimeArr: timeSnapshot,
      currentTimeArrWithoutDay: timeSnapshotWithoutDay
    });
    if(!this.isPause)Countdowner.ticktock.call(this);
  }
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function padStart(str, minLen, leadChar) {
  str = String(str);
  while (str.length < minLen)
    str = leadChar+str;
  return str;
}