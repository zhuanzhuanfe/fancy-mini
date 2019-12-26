### 概述
- 关于框架  
  fancy-mini大部分功能与框架无关，支持各种小程序框架使用。  
  少部分功能与框架耦合，耦合部分集中抽离成了一个工具文件，以配置的方式使用；不同框架实现相应函数即可使用相应功能。  
  
- 关于代码包大小  
  为避免代码包膨胀，各模块没有合并导出，而是作为单独的文件独立引用。  
  这样，对于支持引用分析的框架，如uni-app、wepy等，只有项目中实际有引用的模块才会被打进小程序代码包中，无任何引用的部分不会被打进小程序代码包中；对于不支持引用分析的项目，如有必要也可以手动按需取用。   

- 关于版本
  - fancy-mini\@2.x （建议）
    - 直接导出es6源码，编译过程和项目统一，避免编译冲突/冗余
    - 包含丰富的jsdoc注释，便于IDE提示补全
    - 需要项目进行配置，使得fancy-mini目录参与编译过程，配置方式详见下文
  - fancy-mini\@1.x
    - 导出编译成es5的代码
    - 不需要参与项目编译

### 使用 - uni-app 框架
- 安装
  ```bash
    npm install --save fancy-mini@2.x
  ```
- 使fancy-mini目录参与项目编译
  - 找到或创建 项目根目录/vue.config.js
  - 增加如下配置：
  ```js
    module.exports = {
      //默认情况下 babel-loader 会忽略所有 node_modules 中的文件。
      //如果你想要通过 Babel 显式转译一个依赖，可以在这个选项中列出来。
      transpileDependencies: ['fancy-mini']
    }
  ```
  - 相关文档
    - [uni-app自定义编译配置](https://uniapp.dcloud.io/collocation/vue-config?id=collocation)
    - [vue配置说明](https://cli.vuejs.org/zh/config/#transpiledependencies)
- 使用js模块  
	直接根据路径引入即可使用，e.g.：
  
	```js
    import {wxPromise} from 'fancy-mini/lib/wxPromise'; //引入需要的模块
    
    //使用该模块
    wxPromise.getSystemInfo().then(sysInfo=>{
      console.log('sysInfo:', sysInfo);
    });
	```
	 [wepyKit模块](./module-wepyKit.html)除外，如果功能模块使用说明中用到了这个模块相关函数作为配置项，需替换成[uniAppKit模块](./module-uniAppKit.html)中对应函数或自行实现相应函数。
	  
- 使用ui组件  
  1. 安装相关依赖
  ```bash
    npm install --save-dev vue-property-decorator # 支持以class的形式书写vue语法
    npm install --save-dev less less-loader # 支持以less的形式书写css语法
  ```
  2. 根据路径引入并使用组件
  ```html
    <script>
      import DialogCommon from 'fancy-mini/components/DialogCommon'; //引入需要的组件
  
      //使用该组件
      export default {
        components : {
          DialogCommon, 
        },
        mounted(){
          this.$refs['dialogCommon'].open({
            content: 'hello',
          })
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
  文档中的组件有些尚未改写成uni-app版，如果文档中提到了某组件，而[源码-uniApp组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-uniApp)中无对应文件，  
  请等待迁移完成后，更新fancy-mini版本，再行使用；或从[源码-wepy组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-wepy)中下载源码自行改造成uni-app组件。

### 使用 - wepy 1.x 框架
- 安装 
  ```bash
    npm install --save fancy-mini@1.x
  ```
- 使用js模块  
	直接根据路径引入即可使用，e.g.：
  
	```js
    import {wxPromise} from 'fancy-mini/lib/wxPromise'; //引入需要的模块
    
    //使用该模块
    wxPromise.getSystemInfo().then(sysInfo=>{
      console.log('sysInfo:', sysInfo);
    });
	```
	[uniAppKit模块](./module-uniAppKit.html) 除外，如果功能模块使用说明中用到了这个模块相关函数作为配置项，需替换成[wepyKit模块](./module-wepyKit.html)中对应函数或自行实现相应函数。
	  
- 使用ui组件  
  - wepy 1.7.0以上 && Mac环境  
  直接根据路径引入即可，e.g.：
  ```html
    <script>
      import DialogCommon from 'fancy-mini/components/DialogCommon'; //引入需要的组件
      
      //使用该组件
      export default class extends wepy.page {
        components = {
          DialogCommon,
        }
        onLoad(){
          this.$invoke('DialogCommon', 'open', {
            content: 'hello',
          });
        }
      }
    </script>
    <template>
      <view>
        <DialogCommon></DialogCommon>
      </view>
    </template>
  ```
  - wepy 1.7.0以下 || Windows环境  
  暂不支持直接引用，请复制粘贴到项目目录中使用  
  原因：  
    issue：[https://github.com/Tencent/wepy/issues/1035](https://github.com/Tencent/wepy/issues/1035)  
    issue：[https://github.com/Tencent/wepy/issues/851](https://github.com/Tencent/wepy/issues/851)
    
  - 附加说明  
  后续新增组件不再提供wepy版，如果文档中提到了某组件，但[源码-wepy组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-wepy)中无对应文件，  
  请从[源码-uniApp组件](https://github.com/zhuanzhuanfe/fancy-mini/tree/master/src/components-uniApp)中下载源码自行改写成wepy组件。
  
- demo项目  
  [fancy-mini-demos](https://github.com/zhuanzhuanfe/fancy-mini-demos)

### 使用 - 其它框架
- 安装 
  ```bash
    # 根据需要选择合适的安装版本
    npm install --save fancy-mini@2.x #直接使用es6源码（建议，注释齐全便于IDE提示补全，编译过程和项目统一避免冲突/冗余）
    # npm install --save fancy-mini@1.x #使用编译成es5的代码
  ```
- [fancy-mini\@2.x]使fancy-mini参与项目编译
  - 类vue框架
    - 找到vue.config.js或其等价文件
    - 加入如下配置：
   
    ```js
     module.exports = {
       //默认情况下 babel-loader 会忽略所有 node_modules 中的文件。
       //如果你想要通过 Babel 显式转译一个依赖，可以在这个选项中列出来。
       transpileDependencies: ['fancy-mini']
     }
    ```
    - 详见[vue配置说明](https://cli.vuejs.org/zh/config/#transpiledependencies)
  - 其它框架
    - 找到配置不编译node_modules目录的地方
    - 修改该配置，将fancy-mini排除在外
   
    ```js
      //e.g. 原配置
      {
        exclude: /node_modules/,
        loader: 'babel',
      }
      // 修改为
      {
        exclude: /node_modules\/(?!(fancy-mini)\/).*/,
        loader: 'babel',
      }
    ```
- 使用js模块  
  直接根据路径引入即可，e.g.：
  ```js
    import {wxPromise} from 'fancy-mini/lib/wxPromise'; //引入需要的模块
    
    //使用该模块
    wxPromise.getSystemInfo().then(sysInfo=>{
      console.log('sysInfo:', sysInfo);
    });
  ```  
  [uniAppKit模块](./module-uniAppKit.html)、[wepyKit模块](./module-wepyKit.html) 除外，这两个模块与对应框架耦合，如果功能模块使用说明中用到了这两个模块相关函数作为配置项，需自行实现相应函数并予以替换。  
    
  
- 使用ui组件  
  本代码库组件部分暂未直接支持其它框架，如有需要，请下载源码自行改造。
   