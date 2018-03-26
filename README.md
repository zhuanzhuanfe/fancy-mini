# fancy-mini
小程序代码库，封装一些常用的js模块和界面组件。  
组件部分基于 [WePY](https://tencent.github.io/wepy/) 框架  
js模块大部分不与框架耦合，包括原生小程序在内均可使用。

## 功能

## 安装

## 使用
为避免代码包膨胀，各模块没有合并导出，而是作为单独的文件各自引入，这样，只有项目中实际有引用的模块才会被打进代码包中。

## demo


## 文档

## TODO
- 补全文档
- demo演示
- 模块进一步抽离：与wepy解耦、尽量减少资源依赖， 耦合逻辑改为可配形式
- wpy-npm-workaround
    + 目前wepy在引用包含多个组件的npm包时，存在bug：  
	    - wepy 1.7.0以上 && Mac环境，可以正常引用， 见issue：https://github.com/Tencent/wepy/issues/851
	    - wepy 1.7.0以下 || Windows环境，无法正常引用， 见issue：https://github.com/Tencent/wepy/issues/1035  

    + 考虑编写一个workaround插件
	    - 配置需要workaround的包名：xxx、...
	    - workaround： 将node_modules/xxx拷贝至src/npm/xxx； 检查src所有引用语句，自动将 'xxx/a' 改为形如'../../src/npm/a'
	    - workaround --revert： 删除src/npm/xxx； 将相对路径引用形式改回模块引用形式。
