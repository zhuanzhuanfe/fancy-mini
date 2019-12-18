const program = require('commander');
const fs = require('fs');
const path = require('path');
const { execCmd, copyFiles } = require('./util');

(async function main(){
  //参数处理
  configOptions(); //配置选项
  const options = parseOptions(); //解析选项

  //配置不同版本对应的编译函数
  const compilers = {
    '1.x': compileV1,
    '2.x': compileV2,
  };
  
  //编译
  let targets = options.target.split(',');
  for (let target of targets) {
    compilers[target]();
  }
}());


//配置选项
function configOptions(){
  program.option('-t, --target <target>', '目标版本，多个以逗号分隔，e.g.：-t 1.x | -t 2.x | -t 1.x,2.x', '2.x');
}

//解析选项
function parseOptions(){
  program.parse(process.argv);

  return {
    target: program.target,
  }
}

//1.x版本编译
async function compileV1() {
  let mode = process.env.NODE_ENV; //'production' | 'develop'
  
  //编译lib目录
  let modeParam = mode === 'production' ? 
    '--compact true --minified --no-comments' :
    '--watch --compact false --no-minified';
  execCmd(`npx --package babel-cli babel -d dist/1.x/lib src/lib/ --copy-files ${modeParam}`);
  
  //编译lib-style目录
  copyFiles({src: 'src/lib-style', dist: 'dist/1.x/lib-style', watch: mode==='develop'});
  
  //编译components目录
  copyFiles({src: 'src/components-wepy', dist: 'dist/1.x/components', watch: mode==='develop'});
}

//2.x版本编译
function compileV2() {
  let mode = process.env.NODE_ENV; //'production' | 'develop'

  //编译lib目录
  copyFiles({src: 'src/lib', dist: 'dist/2.x/lib', watch: mode==='develop'});

  //编译lib-style目录
  copyFiles({src: 'src/lib-style', dist: 'dist/2.x/lib-style', watch: mode==='develop'});

  //编译components目录
  copyFiles({src: 'src/components-uniApp', dist: 'dist/2.x/components', watch: mode==='develop'});
}

