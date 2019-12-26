const program = require('commander');
const fsPromises = require('fs').promises;
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
  let versions = options.target.split(',');
  await Promise.all(versions.map(ver=>compilers[ver]()));
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
  let libJob = execCmd(`npx --package babel-cli babel -d dist/1.x/lib src/lib/ --copy-files ${modeParam}`);
  
  //编译lib-style目录
  let styleJob = copyFiles({src: 'src/lib-style', dist: 'dist/1.x/lib-style', watch: mode==='develop'});
  
  //编译components目录
  let compJob = copyFiles({src: 'src/components-wepy', dist: 'dist/1.x/components', watch: mode==='develop'});
  
  //生成package.json
  let packageJob = createPackageJson({ver: '1.x'});
  
  //生成readme
  let readmeJob = copyFiles({src: 'README.md', dist: 'dist/1.x/README.md', watch: mode==='develop'});
  
  await Promise.all([libJob, styleJob, compJob, packageJob, readmeJob]);
}

//2.x版本编译
async function compileV2() {
  let mode = process.env.NODE_ENV; //'production' | 'develop'

  //编译lib目录
  let libJob = copyFiles({src: 'src/lib', dist: 'dist/2.x/lib', watch: mode==='develop'});

  //编译lib-style目录
  let styleJob = copyFiles({src: 'src/lib-style', dist: 'dist/2.x/lib-style', watch: mode==='develop'});

  //编译components目录
  let compJob = copyFiles({src: 'src/components-uniApp', dist: 'dist/2.x/components', watch: mode==='develop'});

  //生成package.json
  let packageJob = createPackageJson({ver: '2.x'});

  //生成readme
  let readmeJob = copyFiles({src: 'README.md', dist: 'dist/2.x/README.md', watch: mode==='develop'});
  
  await Promise.all([libJob, styleJob, compJob, packageJob, readmeJob]);
}

/**
 * 创建package.json文件
 * @param {string} ver 版本：1.x | 2.x
 * @param {string} [dist="dist/${ver}/package.json"] 输出目录
 */
async function createPackageJson({ver, dist=`dist/${ver}/package.json`}) {
  console.log('[创建] package.json');
  
  //读取根目录下的package.json作为模板
  let baseJson = await fsPromises.readFile('package.json', {encoding: 'utf8'});
  let packageObj = JSON.parse(baseJson);
  
  //修改其中的version相关字段
  packageObj.version = packageObj[`version-${ver}`]; //取目标版本作为version
  for (let prop in packageObj) { //删除多余版本配置
    if (prop.indexOf('version-') === 0)
      delete packageObj[prop];
  }
  
  //生成目标版本对应的package.json
  await fsPromises.writeFile(dist, JSON.stringify(packageObj, null, 2), {encoding: 'utf8'});
}