const program = require('commander');
const fsPromises = require('fs').promises;
const path = require('path');
const { execCmd, copyFiles } = require('./util');

(async function main(){
  //参数处理
  configOptions(); //配置选项
  const options = parseOptions(); //解析选项

  //编译
  await execCmd(`npm run clean`); //清理
  await execCmd(`npm run build -- -t ${options.target}`); //构建
  await execCmd(`npm run doc`); //生成文档

  //发布
  let versions = options.target.split(',');
  for (let ver of versions) {
    await execCmd(`npm publish`, {cwd: `dist/${ver}`});
  }
}());


//配置选项
function configOptions(){
  program.option('-t, --target <target>', '目标版本，多个以逗号分隔，e.g.：-t 1.x | -t 2.x | -t 2.x,1.x', '2.x,1.x');
}

//解析选项
function parseOptions(){
  program.parse(process.argv);

  return {
    target: program.target,
  }
}