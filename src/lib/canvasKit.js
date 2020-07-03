/**
 * canvas工具集
 * @module canvasKit
 */

export default {
  /**
   * 绘制图片，保持宽高比居中裁剪，短边完全展示，长边居中截取
   * 说明：
   *    1.应先绘制图片，后填充图片周边内容，否则图片周边长边方向的现有内容会被擦除
   *    2.在开发者工具上图片多余部分无法被清除，但在真机上正常
   *    3.早期小程序canvas不支持clip，所以采用先绘制再擦除的方式实现，导致绘制顺序比较受限，后续考虑改用clip方式实现，待优化
   * @param ctx  wx.createCanvasContext返回的canvas绘图上下文
   * @param {string} picFile 图片临时文件路径
   * @param {object} picInfo wx.getImageInfo返回的图片原始信息
   * @param {number} x   左上角横坐标
   * @param {number} y   左上角纵坐标
   * @param {number} w   宽度
   * @param {number} h   高度
   * @param {string} [bgColor="#ffffff"] 背景色，裁剪后多余部分用背景色擦除
   *
   */
  aspectFill({ctx, picFile, picInfo,  x, y, w, h, bgColor="#ffffff"}){
    let aspect = picInfo.width / picInfo.height;  //图片宽高比
    let [dx, dy, dw, dh] = [0, 0, 0, 0]; //整张图片绘制位置
    let extras = [];  //需擦除的多余区域
    if (aspect < w/h) {
      dw = w;
      dh = dw/aspect;
      dx = x;
      dy = y - (dh-h)/2;
      extras = [[dx-1, dy-1, dw+2, (dh-h)/2+1], [dx-1, dy+(dh-h)/2+h, dw+2, (dh-h)/2+1]]; //为避免残余半像素的细线，擦除方向多加1px
    } else {
      dh = h;
      dw = dh*aspect;
      dx = x - (dw-w)/2;
      dy = y;
      extras = [[dx-1, dy-1, (dw-w)/2+1, dh+2], [dx+(dw-w)/2+w, dy-1, (dw-w)/2+1, dh+2]];//为避免残余半像素的细线，擦除方向多加1px
    }
    ctx.drawImage(picFile, dx, dy, dw, dh); //保持宽高比，缩放至指定区域后，绘制整张图片
    ctx.save();
    ctx.setFillStyle(bgColor);
    for (let extra of extras) { //擦除整张图片中多余区域
      let [ex, ey, ew, eh] = extra;
      if (ex+ew <= 0 || ey+eh<=0)
        continue;
      if (ex < 0) {
        ew -= Math.abs(ex);
        ex = 0;
      }
      if (ey < 0) {
        eh -= Math.abs(ey);
        ey = 0;
      }
      ctx.fillRect(ex, ey, ew, eh);
    }
    ctx.restore();
  },

  /**
   * 绘制图片，保持图片纵横比，只保证图片的短边能完全显示出来。也就是说，图片通常只在水平或垂直方向是完整的，另一个方向将会发生截取。
   * @param ctx  wx.createCanvasContext返回的canvas绘图上下文
   * @param {string} picFile 图片临时文件路径
   * @param {number} x   左上角横坐标
   * @param {number} y   左上角纵坐标
   * @param {number} w   宽度
   * @param {number} h   高度
   * @param {string} bgColor 背景色，裁剪后多余部分用背景色填充
   * 
   */
  aspectFit({ctx, picFile, x, y, w, h, bgColor}){
    return this._getImageInfo(picFile)
    .then((picInfo)=>{
      let aspect = picInfo.width / picInfo.height;  //图片宽高比
      let [dx, dy, dw, dh] = [0, 0, 0, 0]; //整张图片绘制位置
      if (aspect < w/h) {
        dh = h;
        dw = dh*aspect;
        dx = x - (dw-w)/2;
        dy = y;
      } else {
        dw = w;
        dh = dw/aspect;
        dx = x;
        dy = y - (dh-h)/2;
      }

      if(bgColor){
        ctx.save();
        ctx.setFillStyle(bgColor);
        ctx.fillRect(x,y,w,h);  
        ctx.restore();
      }
      ctx.drawImage(picFile, dx, dy, dw, dh);
    })
  },

  /**
   * 将方形区域切成圆形，场景示例：将头像切成圆形展示
   * 说明：
   *    1.方形区域四角会被填充成指定的背景色，只保留中央圆形区域不变
   *    2.早期小程序canvas不支持clip，所以采用先绘制再擦除的方式实现圆形头像，只能在纯色背景上使用，后续考虑改用clip方式实现，待优化
   * @param ctx wx.createCanvasContext返回的canvas绘图上下文
   * @param {number} x   左上角横坐标
   * @param {number} y   左上角纵坐标
   * @param {number} w   宽度/高度/圆的直径
   * @param {string} [bgColor="#ffffff"] 背景色，擦除部分以背景色填充
   */
  rounded({ctx, x, y, w, bgColor="#ffffff"}){
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(w, w/2);
    ctx.arc(w/2,w/2,w/2,0,2*Math.PI, false);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, w);
    ctx.lineTo(w, w);
    ctx.closePath();
    ctx.setFillStyle(bgColor);
    ctx.fill();
    ctx.restore();
  },

  /**
   * 将矩形切成圆角矩形
   * 说明：
   *    1.方形区域四角会被填充成指定的背景色，只保留中央圆角矩形区域不变
   *    2.早期小程序canvas不支持clip，所以采用先绘制再擦除的方式实现圆角矩形，只能在纯色背景上使用，现推荐改用 canvasKit.createBorderRadiusPath + ctx.clip 生成圆角矩形/图片/边框式实现，待优化
   * @param ctx wx.createCanvasContext返回的canvas绘图上下文
   * @param {number} x   矩形左上角横坐标
   * @param {number} y   矩形左上角纵坐标
   * @param {number} w   矩形宽度
   * @param {number} h   矩形高度
   * @param {number} radius  圆角半径
   * @param {string} [bgColor="#ffffff"] 背景色，擦除部分以背景色填充
   */
  borderRadius({ctx, x, y, w, h, radius, bgColor="#ffffff"}){
    ctx.save();
    ctx.translate(x, y);

    ctx.setFillStyle(bgColor);

    //擦除左上角多余部分
    ctx.beginPath();
    ctx.moveTo(0, 0+radius);
    ctx.quadraticCurveTo(0, 0, 0+radius, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    //擦除右上角多余部分
    ctx.beginPath();
    ctx.moveTo(w-radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();

    //擦除右下角角多余部分
    ctx.beginPath();
    ctx.moveTo(w-radius, h);
    ctx.quadraticCurveTo(w, h, w, h-radius);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    //擦除左下角多余部分
    ctx.beginPath();
    ctx.moveTo(0, h-radius);
    ctx.quadraticCurveTo(0, h, 0+radius, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  /**
   * 生成圆角边框路径，后续可使用该路径绘制圆角矩形、圆角图片、圆角边框等
   * @param ctx wx.createCanvasContext返回的canvas绘图上下文
   * @param {number} x   矩形左上角横坐标
   * @param {number} y   矩形左上角纵坐标
   * @param {number} w   矩形宽度
   * @param {number} h   矩形高度
   * @param {number} radius  圆角半径
   */
  createBorderRadiusPath({ctx, x, y, w, h, radius}){
    ctx.beginPath();
    ctx.moveTo(x, y+radius);
    ctx.quadraticCurveTo(x, y, x+radius, y); //左上角弧线

    ctx.lineTo(x+w-radius, y); //顶部水平线
    ctx.quadraticCurveTo(x+w, y, x+w, y+radius); //右上角弧线

    ctx.lineTo(x+w, y+h-radius);  //右侧竖线
    ctx.quadraticCurveTo(x+w, y+h, x+w-radius, y+h); //右下角弧线

    ctx.lineTo(x+radius, y+h); //底部水平线
    ctx.quadraticCurveTo(x, y+h, x, y+h-radius); //左下角弧线
    ctx.closePath();  //左侧竖线
  },

  /**
   * 绘制文本，支持\n换行
   * @param ctx   wx.createCanvasContext返回的canvas绘图上下文
   * @param {string} text  文本内容，支持\n换行
   * @param {number} x     文本区域（含行高）左上角横坐标；居中对齐时，改取中点横坐标
   * @param {number} y     文本区域（含行高）左上角纵坐标
   * @param {number} fontSize  字号，单位：px
   * @param {string} color     颜色
   * @param {number} lineHeight  行高
   * @param {string} textAlign   水平对齐方式，支持'left'、'center'，其它值没试过
   */
  fillText(ctx, {text, x, y, fontSize, color, lineHeight, textAlign}){
    ctx.save();

    lineHeight = lineHeight || fontSize;
    fontSize && ctx.setFontSize(fontSize);
    color && ctx.setFillStyle(color);
    textAlign && ctx.setTextAlign(textAlign);

    let lines = text.split('\n');
    for (let line of lines) {
      ctx.fillText(line, x, y+lineHeight-(lineHeight-fontSize)/2);
      y += lineHeight;
    }

    ctx.restore();
  },

  /**
   * 字符串过长截断，1个字母长度计为1,1个汉字长度计为2
   * 更新：
   * 1. 早期小程序canvas不支持测量文本实际尺寸，所以采用手动粗略计算的方式实现过长处理
   * 2. 后来小程序canvas提供了measureText接口，支持测量文本实际尺寸信息，本方法待优化
   * @param {string} str 原字符串
   * @param {number} len 最大长度
   * @param {boolean} ellipsis 过长时截断后是否加'...'
   * @return {string} 截断后字符串
   */
  ellipsisStr(str, len, ellipsis=true) {
    var str_length = 0;
    var str_len = 0;
    var str_cut = new String();
    str_len = str.length;
    for (var i = 0; i < str_len; i++) {
      let a = str.charAt(i);
      str_length++;
      if (escape(a).length > 4) {
        //中文字符的长度经编码之后大于4
        str_length++;
      }
      str_cut = str_cut.concat(a);
      if (str_length >= len) {
        str_cut = str_cut.concat(ellipsis&&(str_length>len || i+1<str_len) ? "..." : "");
        return str_cut;
      }
    }
    //如果给定字符串小于指定长度，则返回源字符串；
    if (str_length < len) {
      return str;
    }
  },

  /**
   * 字符串长度，1个字母长度计为1,1个汉字长度计为2
   * canvas目前似乎不支持获取文本绘制后所占宽度，只能根据字数粗略计算了
   * 更新：
   * 1. 后来小程序canvas提供了measureText接口，支持测量文本实际尺寸信息，本方法待优化
   * @param {string} str 字符串
   * @return {number} 总长度
   */
  strLenGraphic(str) {
    var str_length = 0;
    for (var i = 0; i < str.length; i++) {
      let a = str.charAt(i);
      str_length++;
      if (escape(a).length > 4) {
        //中文字符的长度经编码之后大于4
        str_length++;
      }
    }
    return str_length;
  },

  _getImageInfo(picFile) {
    return new Promise((resolve,reject)=>{
      wx.getImageInfo({
        src: picFile,
        success: res =>{
          resolve(res)
        },
        fail: res=>{
          reject(res)
        }
      })
    })
  }
}
