# fancy-mini
小程序代码库：小程序能力搭建/增强、疑难杂症参考处理、组件库、工具库。

## 功能
### 小程序能力搭建/增强
- 健壮高效的登录机制
  - 交互能力：登录行为不用阻断用户操作流程、支持不同场景展示不同登录界面、支持不触发登录的同时悄悄进行个性化定制、支持用户访问要求登录态的业务时自动触发登录流程
  - 开发维护：登录态过期自动重新登录、并发调用自动合并、流程细节对业务方透明、支持多方复用、支持自定义逻辑扩展
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.1-login.html)

- 无限层级的路由机制
  - 问题：小程序原生页面存在层级限制，最多只能同时打开10层页面，超过10层时便会无法打开新页面  
  - 方案：自行维护完整历史记录，超出层级限制后在最后一层进行模拟导航
  - 效果：无限层级，即使超过10层依然可以正常打开正常返回 [体验](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.2-navigate.html#demo)
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.2-navigate.html)

- 灵活易扩展的请求管理
  - 功能：发起数据请求
  - 特点：可以方便地在请求前后添加/移除各种扩展逻辑，如：设置默认表单类型、植入cookie逻辑、植入登录态检查逻辑、植入网络异常处理逻辑、植入云函数处理逻辑等
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.3-request.html)
   
- cookie机制
  - 问题：很多时候，后端现有接口是先前对接M页/APP开发的，可能会使用cookie进行参数获取/传递；但小程序不支持cookie，导致后端接口复用/多端兼容成本增高。  
  - 方案：利用前端存储，自行模拟&管理cookie；封装接口调用过程，植入cookie逻辑。
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.4-cookie.html)
  
- canvas工具集
  - 功能：封装了一些常用的canvas操作，提高小程序canvas易用性，包括：图片居中裁剪、圆形头像、border-radius、多行文本、字符串过长截断/添加省略号等
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.5-canvasKit.html)
  
- wx Promise化
  - 问题：目前小程序API均以回调形式提供，当逻辑较为复杂时会造成回调函数层层嵌套，影响代码可读性和逻辑清晰性，且不利于并发时序控制
  - 方案：将小程序API统一改造成Promise形式使用
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.6-wxPromise.html)
  
- 跨页面传参
  - 场景1：后一页面向前一页面传参，如：发布页，点击选择分类->选择分类页，选定分类->自动返回发布页，此时发布页如何获取选择结果
  - 场景2：前一页面向后一页面传递大量数据，如：手机估价页，点击卖掉换钱->发布页，此时发布页如何获取用户在估价页填写的大量表单数据
  - 方案特点：无需借用后端接口，无需污染前端storage，纯内存操作性能较好；逻辑独立、通用，对页面代码无侵入
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.7-routeParams.html)

- 跨页面事件
  - 功能：支持进行跨页面的事件通信
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.8-eventHub.html)
  
- 入口构造工具
  - 用途1：支持PM&运营人员自助生成投放链接，避免频繁向FE沟通索要，节约沟通成本和打断成本
  - 用途2：支持FE&QA自助开发/测试没有线上入口的新页面，避免开发测试时引入作为临时入口的脏代码
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.9-customEntry.html)
   
- 二维码测试工具
  - 用途1：支持扫码进入开发版/体验版小程序，便于QA在上线前充分测试二维码相关功能
  - 用途2：支持查看二维码编码参数，便于检查投放的二维码是否正确
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.a-qrTest.html)

- 激励视频播放器
  - 功能：封装激励视频的加载、播放时序，使时序细节对外透明，便于调用；Promise化封装。
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.b-rewardedVideoPlayer.html)
  
### 小程序疑难杂症参考处理
- toast截断问题  
  - 问题：原生toast内容超过7个汉字时会被截断无法展示完整，自定义toast又无法覆盖textarea、video等层级最高的原生组件
  - 方案：根据内容长度自动选择合适的原生提示：带图标的原生toast、不带图标的原生toast、系统弹窗
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-3.1-adaptiveToast.html)

- textarea遮盖浮层问题
  - 问题：textarea为原生组件层级最高，会遮盖价格填写蒙层、红包选择蒙层、绑定手机号提示框等各种普通浮层元素；特别是页面交互较复杂、浮层元素较多、出现时机较不确定时，难以有效规避。
  - 方案：封装一个自定义TextAreaEle组件，使其在处于编辑状态时使用原生textarea组件，处于非编辑状态时自动改用普通&lt;view&gt;元素展现内容
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-3.2-textArea.html)
  
### 小程序组件库
- 通用弹窗
  - 功能：通用对话框，支持样式配置（单个/多个按钮、横版/竖版、带/不带关闭图标、带/不带顶部图标、自定义内联样式等）、按钮监听、按钮分享、按钮获取手机号、按钮异步交互结果统一返回等
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-4.1-dialogCommon.html)

- 新手引导
  - 功能：新手引导、新功能操作引导
  - 特点：
    - 就地高亮：引导蒙层中高亮元素即为页面中实际元素
    - 就地交互：高亮区域可直接进行点击等交互
    - 依次引导：展示引导蒙层->响应用户点击->等待交互完毕->展示下一个引导蒙层->...
    - 公共逻辑抽离：公共逻辑统一封装，高亮元素只需进行少量配置，不必关注引导细节
    - [体验](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-4.2-operationGuide.html#demo)
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-4.2-operationGuide.html)

### 实用工具库
- 免并发修饰器 
  - 免并发 @noConcurrent  
    功能：在上一次操作结果返回之前，不响应重复操作  
    场景示例：用户连续多次点击同一个提交按钮，只响应一次，而不是同时提交多份表单 [体验](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html#demo)  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html)

  - 步骤并合 @mergingStep  
    功能：步骤并合，避免公共步骤重复执行   
    场景示例：  
      页面内同时发生如下三个请求： 登录-发送接口A、登录-发送接口B、登录-发送接口C  
      未使用本修饰器时，网络时序：登录，登录，登录 - 接口A，接口B，接口C， 登录请求将会被发送三次  
        使用本修饰器时，网络时序：登录 - 接口A，接口B，接口C，登录请求只会被发送一次 [体验](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html#demo)  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html) 
    
  - 单通道执行 @singleAisle  
    功能： 使得并发调用逐个顺序执行  
    场景示例：  
    页面中多处同时调用弹窗函数  
    未使用本修饰器时，执行时序：弹窗1、弹窗2、弹窗3同时展现，用户同时看到多个弹窗堆在一起and/or弹窗相互覆盖  
    使用本修饰器时，执行时序：弹窗1展现、等待交互、用户关闭 => 弹窗2展现、等待交互、用户关闭 => 弹窗3展现、等待交互、用户关闭，弹窗函数依次顺序执行 [体验](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html#demo)  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html)

  - 多函数互斥 @makeMutex  
    功能： 多函数互斥免并发  
    场景示例： 跳转相关函数navigateTo、navigateToMiniProgram、reLaunch等相互之间免并发  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.1-noConcurrent.html)

- 异常捕获修饰器
  - 异常捕获 @errSafe  
    功能：兼容函数异常  
    场景示例：页面获取数据后交由各子函数进行解析，子函数数据解析异常予以自动捕获，避免局部数据问题导致整个页面瘫痪  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.2-errSafe.html)

  - 异常提示 @withErrToast  
    功能： 兼容异常，响应交互  
    场景示例： 页面操作响应过程，若出现异常自动予以捕获并toast提示，避免交互无响应  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.2-errSafe.html)

- 快捷兼容修饰器
  - 兼容wx格式回调 @supportWXCallback  
    功能：使async/promise形式的函数自动支持success、fail、complete回调  
    场景示例：将回调形式的api改写为promise形式后，兼容旧代码  
    [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.3-compatible.html)

- wepyKit
  - 功能：wepy1.x框架工具集，与wepy1.x框架耦合度较高的功能在此模块中提供，如：注册全局this属性、注册全局页面钩子等
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.4-wepyKit.html)

- operationKit  
  - 功能：各种杂七杂八的通用基础操作
  - [详情](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-5.5-operationKit.html)
  
## 演示
- 小程序名称：fancyDemos   
- 访问：  
![二维码](https://zhuanzhuanfe.github.io/fancy-mini/static/images/fancyQrCode.jpg)  
- 源码：[fancy-mini-demos](https://github.com/zhuanzhuanfe/fancy-mini-demos) （示例逐步补全中）  


## 使用
- [setup](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-0-getStarted.html)
- [各功能使用说明](https://zhuanzhuanfe.github.io/fancy-mini/tutorial-2.1-login.html)
- [各功能api查询](https://zhuanzhuanfe.github.io/fancy-mini/BaseLogin.html)
