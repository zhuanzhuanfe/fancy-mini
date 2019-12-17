const { exec } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * 执行命令行
 * @param {string} cmd 命令
 */
async function execCmd(cmd) {
  //使得命令行以utf8格式输出内容（windows环境需单独设置，mac环境默认就是utf8）
  const setExecEncoding = process.platform === "win32" ? '@chcp 65001 >nul & cmd /d/s/c' : '';
  
  const child = exec(`${setExecEncoding} ${cmd}`, {encoding: 'utf8'});

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  return new Promise(resolve=>{
    child.on('close', resolve);
  });
}

/**
 * 复制文件/目录
 * @param {string} src 源位置
 * @param {string} dist 目标位置
 * @param {boolean} watch 是否监听后续修改
 */
async function copyFiles({src, dist, watch}){
  src = path.normalize(src);
  dist = path.normalize(dist);

  await _copyFiles({src, dist});
  
  let watcher = null;
  if (watch) {
    watcher = fs.watch(src, {recursive: true});
    watcher.on('change', (eventType, filename)=>{
      let srcFile = path.join(src, filename);
      let distFile = path.join(dist, filename);
      console.log(`[修改] ${srcFile} => ${distFile}`);
      fsPromises.copyFile(srcFile, distFile);
    });
  }
  
  return {
    watcher,
  }
}

/**
 * 复制文件/目录
 * @ignore
 * @param {string} src 源位置
 * @param {string} dist 目标位置
 */
async function _copyFiles({src, dist}){
  let srcStat = await fsPromises.stat(src);

  if (srcStat.isFile()) {
    console.log(`[拷贝] ${src} => ${dist}`);
    await fsPromises.copyFile(src, dist);
    return;
  }

  if (!srcStat.isDirectory()) {
    return;
  }

  if (!fs.existsSync(dist)) {
    await fsPromises.mkdir(dist, {recursive:true});
  }

  let children = await fsPromises.readdir(src);
  for (let child of children) {
    await _copyFiles({
      src: path.join(src, child),
      dist: path.join(dist, child),
    });
  }
}

module.exports = {
  execCmd,
  copyFiles,
}