const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 执行命令行
 * @param {string} cmd 命令
 */
function execCmd(cmd) {
  //使得命令行以utf8格式输出内容（windows环境需单独设置，mac环境默认就是utf8）
  const setExecEncoding = process.platform === "win32" ? '@chcp 65001 >nul & cmd /d/s/c' : '';
  
  const child = exec(`${setExecEncoding} ${cmd}`, {encoding: 'utf8'});

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  child.on('close', (code) => {
  });
};

/**
 * 复制文件/目录
 * @param {string} src 源位置
 * @param {string} dist 目标位置
 * @param {boolean} watch 是否监听后续修改
 */
function copyFiles({src, dist, watch}){
  src = path.normalize(src);
  dist = path.normalize(dist);
  
  let srcStat = fs.statSync(src);

  if (srcStat.isFile()) {
    console.log(`[拷贝] ${src}=>${dist}`);
    fs.copyFileSync(src, dist);
    watch && fs.watch(src, ()=>{
      console.log(`[修改] ${src}=>${dist}`);
      fs.copyFileSync(src, dist);
    });
    return;
  }

  if (!srcStat.isDirectory()) {
    return;
  }

  if (!fs.existsSync(dist)) {
    execCmd(`mkdir ${dist}`)
  }
  
  let children = fs.readdirSync(src);
  for (let child of children) {
    copyFiles({
      src: path.join(src, child),
      dist: path.join(dist, child),
      watch,
    })
  }
}

module.exports = {
  execCmd,
  copyFiles,
}