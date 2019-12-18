const {execCmd, copyFiles} = require('./util');

(async function main(){
  console.log('正在生成文档');
  await execCmd(`npx jsdoc -c jsdoc.conf.json`);
  await copyFiles({
    src: 'docs-src/static',
    dist: 'docs/static',
    watch: false,
    printLog: false,
  });
  console.log('文档生成完毕');
}());
