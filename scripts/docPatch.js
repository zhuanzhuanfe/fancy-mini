const fs = require('fs');
const path = require('path');

(function main(){
  copyStaticFiles({
    src: 'docs-src/static',
    dist: 'docs/static',
  })
}());

function copyStaticFiles({src, dist}){
  let srcStat = fs.statSync(src);
  
  if (srcStat.isFile()) {
    fs.copyFileSync(src, dist);
    return;
  }

  if (!srcStat.isDirectory()) {
    return;
  }

  if (!fs.existsSync(dist))
    fs.mkdirSync(dist);
  
  let children = fs.readdirSync(src);
  for (let child of children) {
    copyStaticFiles({
      src: path.join(src, child),
      dist: path.join(dist, child),
    })
  }
}