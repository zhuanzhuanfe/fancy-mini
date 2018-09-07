# fancy-mini
小程序代码库，封装一些常用的功能模块和ui组件。  
开发过程使用[wepy](https://tencent.github.io/wepy/)框架，对非wepy项目亦有一定程度兼容。  

## 功能
### 小程序能力搭建/增强
- 无限层级路由策略
  - 问题：小程序原生页面存在层级限制，最多只能同时打开10层页面，超过10层时便会无法打开新页面  
  - 方案：自行维护完整历史记录，超出层级限制后在最后一层进行模拟导航
  - 使用：参见 [无限层级路由方案](./docs/无限层级路由方案.md)
  
- 登录模块
  - 功能：封装了登录过程，并做了静默授权、前后端session有效期不一致纠偏、曾经未授权纠偏、免并发、自动携带/种植cookie、支持Promise等处理，
  使得登录过程对业务逻辑透明。
  - 使用： 待补充 -----
  
- cookie模块
  - 问题：很多时候，后端现有接口是先前对接M页/APP开发的，可能会使用cookie进行参数获取/传递；但小程序不支持cookie，导致后端接口复用/多端兼容成本增高。  
  - 方案：利用前端存储，自行模拟&管理cookie；封装接口调用过程，植入cookie逻辑。
  - 使用： 待补充 ----
  
- canvas工具集
  - 功能：封装了一些常用的canvas操作，提供更接近dom和css的使用方式
  - 使用：参见 [canvasKit](./src/canvasKit.js)
  
- wx Promise化
  - 问题：目前小程序API均以回调形式提供，当逻辑较为复杂时会造成回调函数层层嵌套，影响代码可读性和逻辑清晰性，且不利于并发时序控制
  - 方案：将小程序API统一改造成Promise形式使用
  - 使用：参见 [Promise化的小程序API](./docs/Promise化的小程序API.md)
  
- wxRefine
  - 功能：对小程序部分API做自定义改造，以优化性能/满足特定需求，可与wxPromise、无限层级路由方案等结合使用，如：改造wx.getSystemInfo、wx.getLocation、wx.setStorage，引入缓存逻辑以优化性能
  - 使用：待补充 ----

- 渠道埋点策略
  - 问题：需求中经常需要统计各个活动各个投放入口带来的流量和各步骤转化率，入口标识须层层传递，导致埋点过程繁琐，效率低下
  - 方案：利用小程序存在APP级生命周期的特性，在app onShow中记录流量来源，并自动携带到该次访问的所有页面的所有埋点中，使得渠道逻辑投放入口逻辑对埋点过程透明
  - 使用： 待补充 -----

- M页内嵌&交互方案
  - 功能：封装了小程序与小程序内嵌M页交互过程，并做了登录、支付、多端兼容等处理
  - 使用： 待补充 -----

- 跨页面传参
  - 功能：后一页面向前一页面传参（如：发布页-分类列表页-选定分类-自动返回发布页，获取所选分类）、前一页面向后一页面传递大量数据（如：手机估价-卖掉换钱-发布页，获取并填充估价表单）
  - 使用： 待补充 ------

- 入口构造工具

- 二维码测试工具
  - 功能：支持扫码进入开发版/体验版小程序，便于测试二维码相关功能
  - 使用： 待补充

### 小程序疑难杂症参考处理
- toast长度截断问题  
  - 问题：原生toast内容超过7个汉字时会被截断无法展示完整，自定义toast又无法覆盖textarea、video等层级最高的原生组件
  - 方案：根据内容长度自动选择合适的原生提示：带图标的原生toast、不带图标的原生toast、系统弹窗
  - 使用：参见 [不受长度限制、不受层级约束的原生toast](./docs/不受长度限制、不受层级约束的原生toast.md)

- textarea遮盖浮层问题
  - 问题：textarea为原生组件层级最高，会遮盖价格填写蒙层、红包选择蒙层、绑定手机号提示框等各种普通浮层元素；特别是页面交互较复杂、浮层元素较多、出现时机较不确定时，难以有效规避。
  - 方案：textarea处于编辑状态时使用原生textarea组件，处于非编辑状态时改用普通&lt;view&gt;元素展现内容
  - 使用：参见 [TextAreaEle 组件](./components/TextAreaEle.wpy)
  
### 小程序ui组件库
- DialogCommon
  - 功能：通用对话框，支持样式配置（单个/多个按钮、横版/竖版、带/不带关闭图标、带/不带顶部图标、自定义内联样式等）、按钮监听、按钮分享、按钮获取手机号、按钮异步处理结果统一返回等
  - 使用： 参见 [DialogCommon 组件](./components/DialogCommon.wpy)

- 待补充 -----

### 实用工具函数
- decorators 
  - @noConcurrent, @makeMutex  
    功能：免并发修饰器  
    示例：用户连续多次点击提交按钮时，只进行一次提交，而不重复处理  
    使用：参见 [免并发修饰器](./src/decorator/noConcurrent.js)  
    
  - @errSafe, @withErrToast  
    功能：异常捕获修饰器  
    示例：页面获取数据后交由各子函数进行解析，子函数数据解析异常应予以捕获，避免局部数据问题导致整个页面瘫痪  
    使用： 参见 [异常捕获修饰器](./src/decorator/errSafe.js)

  - @mergingStep  
    功能：步骤并合修饰器，避免公共步骤并发进行  
    示例：页面内多处同时触发登录时，只实际进行一次登录，并将登录结果返给各触发方  
    使用：参见[步骤并合修饰器](./src/decorator/mergingStep.js)

- wepyKit
  - 功能：wepy工具集，与wepy框架耦合度较高的功能在此模块中提供，如：注册全局this属性、注册全局页面钩子等
  - 使用： 参见 [wepyKit](./src/wepyKit.js)

- debugKit  
  待补充 -----
  
- operationKit  
  待补充 -----
  
- 待补充 -----

## 安装
`npm install --save fancy-mini`

## 使用 - wepy项目
- 关于代码包大小  
  为避免代码包膨胀，各模块没有合并导出，而是作为单独的文件各自引入，  
  这样，只有项目中实际有引用的模块才会被打进小程序代码包中，无任何引用的部分不会影响小程序的代码包体积。    

- 引用js模块  
	普通模块直接根据路径引入即可使用，如：
	```js
	import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
	
	console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
	```
	复杂模块可能还需进行些许配置，具体参见模块各自的使用说明。

- 引用组件  
待补充 ----  

完整使用demo，参见 [fancy-mini-demos](https://github.com/zhuanzhuanfe/fancy-mini-demos)

## 使用 - 非wepy项目
- 引用js模块  
  js模块中与wepy框架耦合的部分均已抽离至[wepyKit模块](./src/wepyKit.js)，并以配置的形式单独引入。  
  非wepy项目引用方式可参考"使用 - wepy项目"小节，只是若配置过程中使用到了wepyKit模块，需自行实现wepyKit相关功能并予以替换。  
  
- 引用组件  
  本代码库组件部分均基于wepy框架开发，不直接支持非wepy项目，如有需要，请下载源码自行改造。


## TODO
- 补全模块
- 补全文档
- 补全demo
    
- wpy-npm-workaround
    + 目前wepy在引用包含多个组件的npm包时，存在bug：  
	    - wepy 1.7.0以上 && Mac环境，可以正常引用， 见issue：https://github.com/Tencent/wepy/issues/851
	    - wepy 1.7.0以下 || Windows环境，无法正常引用， 见issue：https://github.com/Tencent/wepy/issues/1035  
    + 可直接拷贝至本地目录使用，但最好能提供更友好的引用方式