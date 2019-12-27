/**
 * 事件中心，用于跨组件/跨页面事件通信，详见 {@tutorial 2.8-eventHub}
 */
class EventHub {
  _validEvents = []; //事件列表
  _listeners = []; //监听列表

  /**
   * 构造函数
   * @param {Array<string>} validEvents 配置的事件列表
   */
  constructor({validEvents}){
    if (!Array.isArray(validEvents)) {
      console.error('[EventHub] bad param, validEvents shall be Array<string>');
      return;
    }

    this._validEvents = validEvents;
  }

  /**
   * 监听指定事件
   * @param {string} eventType 事件类型
   * @param {function} handler 监听函数
   * @param {string} [persistType='once'] 持续策略：once-触发一次后自动移除监听 | always-每次都触发
   */
  subscribe({eventType, handler, persistType='once'}){
    if (!(this._validEvents.includes(eventType))) {
      console.error('[EventHub] subscribe，试图监听无效事件：', eventType, '有效事件列表：', this._validEvents);
      return;
    }

    this._listeners.push({
      eventType,
      handler,
      triggerCount: 0, //触发了几次
      limitCount: persistType==='once' ? 1 : 0, //最多触发几次，0表示不限
    });
  }

  /**
   * 触发指定事件
   * @param {string} eventType 事件类型
   * @param {*} data 传递给监听函数的数据
   */
  notify({eventType, data}){
    if (!(this._validEvents.includes(eventType))) {
      console.error('[EventHub] notify，试图触发无效事件：', eventType, '有效事件列表：', this._validEvents);
      return;
    }

    //监听回调
    for (let listener of this._listeners) {
      if (listener.eventType !== eventType)
        continue;

      try {
        listener.handler(data);
      } catch (e) {
        console.error(
          '[EventHub] caught err when exec handler', 
          'err:', e, 
          'eventType:', eventType, 
          'handler:', listener.handler
        );
      }

      ++ listener.triggerCount;
    }
    

    //移除达到回调上限的监听函数
    this._listeners = this._listeners.filter(listener=>!(listener.limitCount>0 && listener.limitCount<=listener.triggerCount));
  }

  /**
   * 取消监听
   * @param {string} eventType 事件类型
   * @param {function} handler 监听函数
   */
  unsubscribe({eventType, handler}){
    this._listeners = this._listeners.filter(listener=>!(listener.eventType===eventType && listener.handler===handler));
  }
}

export default EventHub;