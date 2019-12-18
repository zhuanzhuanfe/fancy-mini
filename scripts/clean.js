const rimraf = require("rimraf");

console.log('正在清理输出目录');
rimraf.sync("dist/");
console.log('清理完毕');