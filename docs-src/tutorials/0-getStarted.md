### 概述
- 关于框架  
  fancy-mini大部分功能与框架无关，支持各种小程序框架使用。  
  少部分功能与框架耦合，耦合部分集中抽离成了一个工具文件，以配置的方式使用；不同框架实现相应函数即可使用相应功能。  
  
- 关于代码包大小  
  为避免代码包膨胀，各模块没有合并导出，而是作为单独的文件独立引用。  
  这样，对于支持引用分析的框架，如uni-app、wepy等，只有项目中实际有引用的模块才会被打进小程序代码包中，无任何引用的部分不会被打进小程序代码包中；对于不支持引用分析的项目，如有必要也可以手动按需取用。   

- 关于版本
  - fancy-mini@2.x
    - 适合可以直接使用es6源码的框架，如uni-app（uni-app默认会编译node_modules中的代码）
    - 直接导出源码，包含丰富的注释，不含babel转译内容，由项目负责完成es6转es5、代码压缩等各种编译处理工作
  - fancy-mini@1.x
    - 适合需要使用es5代码的框架，如wepy 1.x（wepy 1.x默认不会编译node_modules中的代码）
    - 导出es5代码，fancy-mini已经做了es6转es5、代码压缩等各种编译处理

### 使用 - uni-app 框架
- 安装
  ```bash
    npm install --save fancy-mini@2.x
  ```
- 引用js模块  
	直接根据路径引入即可使用，e.g.：
	```js
    import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
    
    console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
	```
	 [wepyKit模块](./module-wepyKit.html)除外，如果功能模块使用说明中用到了这个模块相关函数作为配置项，需替换成[uniAppKit模块](./module-uniAppKit.html)中对应函数或自行实现相应函数。
	  
- 引用ui组件  
  1. 安装相关依赖
  ```bash
    npm install --save-dev vue-property-decorator # 支持以class的形式书写vue语法
    npm install --save-dev less less-loader # 支持以less的形式书写css语法
  ```
  2. 根据路径引入并使用组件
  ```html
    <script>
      import DialogCommon from 'fancy-mini/components/DialogCommon'; //引入需要的组件
  
      export default {
        components : {
          DialogCommon, //使用该组件
        }
      }
    </script>
    <template>
      <view>
        <dialog-common ref="dialogCommon"></dialog-common>
      </view>
    </template>
  ```
  3. 附加说明  
  文档中的组件有些尚未改写成uni-app版，如果文档中提到了某组件，而[源码-uniApp组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-uniApp)目录中无对应文件，  
  请等待迁移完成后，更新fancy-mini版本，再行使用；或从[源码-wepy组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-wepy)中下载源码自行改造成uni-app组件。

### 使用 - wepy 1.x 框架
- 安装 
  ```bash
    npm install --save fancy-mini@1.x
  ```
- 引用js模块  
	直接根据路径引入即可使用，e.g.：
	```js
	import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
	
	console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
	```
	[uniAppKit模块](./module-uniAppKit.html) 除外，如果功能模块使用说明中用到了这个模块相关函数作为配置项，需替换成[wepyKit模块](./module-wepyKit.html)中对应函数或自行实现相应函数。
	  

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
    
  - 附加说明  
  后续新增组件不再提供wepy版，如果文档中提到了某组件，但[源码-wepy组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-wepy)目录中无对应文件，  
  请从[源码-uniApp组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-uniApp)目录中下载源码自行改写成wepy组件。
  
- demo项目  
  [fancy-mini-demos](https://github.com/zhuanzhuanfe/fancy-mini-demos)

### 使用 - 其它框架
- 安装 
  ```bash
    # 根据需要选择合适的安装版本
    npm install --save fancy-mini@2.x #直接使用es6源码
    npm install --save fancy-mini@1.x #使用编译成es5的代码
  ```
- 引用js模块  
  直接根据路径引入即可，e.g.：
  ```js
    import canvasKit from 'fancy-mini/lib/canvasKit'; //引入需要的模块
	
    console.log('canvasKit:', canvasKit, 'canvasKit.fillText:', canvasKit.fillText); //使用该模块
  ```  
  [uniAppKit模块](./module-uniAppKit.html)、[wepyKit模块](./module-wepyKit.html) 除外，这两个模块与对应框架耦合，如果功能模块使用说明中用到了这两个模块相关函数作为配置项，需自行实现相应函数并予以替换。  
    
  
- 引用ui组件  
  本代码库组件部分暂未直接支持其它框架，如有需要，请下载源码自行改造。
   