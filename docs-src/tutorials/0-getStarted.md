### 安装
`npm install --save fancy-mini`

### 使用 - 概述
- 关于框架  
  fancy-mini大部分功能与框架无关，支持各种小程序框架使用。  
  少部分功能与框架耦合，耦合部分集中抽离成了一个工具文件，以配置的方式使用；不同框架实现相应工具即可使用相应功能。  
  

- 关于代码包大小  
  为避免代码包膨胀，各模块没有合并导出，而是作为单独的文件各自使用。  
  这样，对于支持引用分析的框架，只有项目中实际有引用的模块才会被打进小程序代码包中，无任何引用的部分不会影响小程序的代码包体积；对于不支持引用分析的项目，如有必要也可以手动按需取用。   


### 使用 - wepy 1.x 框架
 

- 引用js模块  
	直接根据路径引入即可使用，e.g.：
	```js
	import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
	
	console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
	```
	

- 引用ui组件  
  - wepy 1.7.0以上 && Mac环境  
  直接根据路径引入即可，e.g.：
  ```js
    import DialogCommon from 'fancy-mini/components/DialogCommon';
    export default class extends wepy.page {
      components = {
        DialogCommon,
      }
    }
  ```
  - wepy 1.7.0以下 || Windows环境  
  暂不支持直接引用，请复制粘贴到项目目录中使用  
  原因：  
    issue：[https://github.com/Tencent/wepy/issues/1035](https://github.com/Tencent/wepy/issues/1035)  
    issue：[https://github.com/Tencent/wepy/issues/851](https://github.com/Tencent/wepy/issues/851)
    
- demo  
  [fancy-mini-demos](https://github.com/zhuanzhuanfe/fancy-mini-demos)（逐步补全中）

### 使用 - 其它框架
- 引用js模块  
  直接根据路径引入即可，e.g.：
  ```js
    import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
	
    console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
  ```  
  [wepyKit模块](./module-wepyKit.html)除外，该模块与wepy1.x框架耦合，如果功能示例中用到了[wepyKit](./module-wepyKit.html)，需自行实现相应功能并予以替换。  
    
  
- 引用ui组件  
  本代码库组件部分均基于wepy1.x框架开发，暂未支持非wepy1.x项目，如有需要，请下载源码自行改造。
   