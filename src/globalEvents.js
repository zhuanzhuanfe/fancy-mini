/**
 * 全局事件
 * 对小程序全局事件进行集中定义和管理
 * @module
 */

import EventHub from './EventHub';

/**
 * 登录授权相关事件
 * | eventType | 语义 | 参数 | 
 * | --- | --- | --- | 
 * | userAuthFinish | 登录授权交互结束 | 交互结果，类型：{@link BaseLogin~UserAuthRes} |
 */
const authEvents = new EventHub({
  validEvents: [
    'userAuthFinish', //授权过程结束，授权入口页面触发
  ]
});

export {
  authEvents
}