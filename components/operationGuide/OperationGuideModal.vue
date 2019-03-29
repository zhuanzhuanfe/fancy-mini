<!--
新手引导
使用方式：
1. 页面中引入本组件
2. 操作区域进行引导配置:
    1 操作区域高亮元素需要设置id，便于模块获得元素位置和宽高
    2 操作区域高亮元素需要支持动态修改style，便于模块调整元素层级和样式，使其浮现在蒙层之上
    3 操作区域处理函数需要使用@operationGuideAction修饰器，便于模块监听操作进度
3. 展示新手引导：this.$root.$invoke('OperationGuideModal', 'open', {}), 参数格式见open函数

e.g.：
页面xxx.wpy：
//页面引入本组件
<template>
  <OperationGuideModal></OperationGuideModal>
</template>
<script>
  import OperationGuideModal from 'fancy-mini/components/operationGuide/OperationGuideModal';
  export default class extends wepy.page {
    components = {
      OperationGuideModal,
    }
  }
</script>

组件xxx.wpy：
<template>
  <view id="withdrawArea" style="{{guidingStyle}}"> //操作区域高亮元素 设置id、支持动态修改style
    //金币图标、金币数额...
    <view @tap="onWithdraw">点击提现</view>
  </view>
</template>
<script>
  import {operationGuideAction} from 'fancy-mini/components/operationGuide/operationGuide';
  
  export default class extends wepy.component {
    data = {
      guidingStyle: '', //新手引导状态附加样式
    },
    
    methods = {
       @operationGuideAction({eleId: 'withdrawArea'}) //操作区域处理函数使用@operationGuideAction修饰器，入参：eleId-操作区域高亮元素id
      async onWithdraw(){}
    }
    
    //展示新手引导
    async showOperationGuide(){
      await this.$root.$invoke('OperationGuideModal', 'open', {
        eleId: 'withdrawArea',
        eleStyleRenderer: (style)=>{
          this.guidingStyle = style;
          this.$apply();
        },
        
        tip: {
          show: true,
          text: '金币可以提现到微信钱包，快去试试吧',
        },
        pointer: {
          show: true,
        },
        //高亮区域、文案框位置、指针位置等更多配置，参见本文件中 defaultOpts 相关注释
      });
    }
  }
</script>

注意事项：
  1. 当操作区域祖先元素有position:fixed或transform时，不支持使用本模块 （模块会将操作区域position设为fixed，并调整z-index使其浮在蒙层之上，从而
  达到高亮操作区域的效果，但此种情况下操作区域层级受限于该祖先元素，无法高亮）
  2. 高亮时元素会脱离文档流，要求脱离前后文档布局不变（即要求父元素定宽定高or高亮元素本身就不在正常文档流中）
  3. 高亮元素不能依赖父元素宽高，因为高亮时position: fixed，容器会变成viewport
-->
<template>
  <view @tap="onModal" wx:if="{{show}}" class="modal">
    <view class="highlightArea" style="z-index: {{zIdx}};{{highlightAreaStyle}}"></view>
    <view class="guide {{options.guideUI}}">
      <view class="tip" wx:if="{{options.tip.show}}" style="{{tipPosStr}};z-index:{{zIdx+1}}">{{options.tip.text}}<view class="triangle {{options.tip.pointTo}}"></view></view>

      <view class="pointer {{options.pointer.pointTo}}" wx:if="{{options.pointer.show}}"
             style="{{pointerPosStr}}; z-index:{{zIdx+1}}"
      ></view>
    </view>
  </view>
  
</template>

<script>
  import wepy from 'wepy';
  import {deepAssign, deepClone} from 'fancy-mini/lib/operationKit';
  import {guideStatus} from './operationGuide';
  
  export default class extends wepy.component {
    props = {}
    
    data = {
      zIdx: 1000,
      show: false,
      actionRect: {}, //操作区域坐标
      rpx2px: 0.5,
      sysInfo: {},
      tipPosStr: '',
      pointerPosStr: '',
      highlightAreaStyle: '',
      
      options: {},
      defaultOpts: {
        eleId: '', //操作区域顶层元素
        eleStyleRenderer: null, //操作区域顶层元素需支持动态修改样式
        highlightArea: { //高亮区域
          extend: "10 10 10 10", //操作区域四周额外高亮范围，最多接受四个值，依次为：上右下左，单位：rpx
          borderRadius: 0, //高亮区域边框圆角：number-应用于四个角 | string-同css，如"0 36rpx 36rpx 0"
        },
        
        //引导版式
        guideUI: 'hand', //版式：hand-小手指引（动态，效果参见种树项目）| bear-小熊指引（静态，效果参见寻宝项目）
        //引导文案
        tip: {
          show: true, //是否展示
          text: '', //文案内容，支持'\n'换行
          top: '', //文案位置，文案框（不含小三角）相对于操作区域，单位：rpx
          right: '',
          bottom: '',
          left: '',
          pointTo: 'topLeft', //小三角指向哪个方向：topLeft、topRight, bottomLeft, bottomRight
        },
        //引导图标（手型指针）
        pointer: {
          show: true, //是否展示
          top: '', //图标位置，相对于操作区域定位
          right: '',
          bottom: '',
          left: '',
          pointTo: 'left', //指向哪个方向：left、right、top、bottom
        },
      }
    }
    
    methods = {
      onModal(){
        guideStatus.onActionStart && guideStatus.onActionStart();
        guideStatus.onActionFinish && guideStatus.onActionFinish();
      }
    }

    calculateWidgetsStyle(){
      let actionRelativeRect = { //将操作区域坐标转为position定位形式（如 right值 由 距屏幕左侧坐标值 转为 距屏幕右侧距离）
        top: this.actionRect.top,
        left: this.actionRect.left,
        right: this.sysInfo.windowWidth - this.actionRect.right,
        bottom: this.sysInfo.windowHeight - this.actionRect.bottom,
      };
      
      //文案框
      let tipPos = '';
      for (let side of ['top', 'bottom', 'left', 'right']){
        if (typeof this.options.tip[side]==='number') {
          let value = this.options.tip[side] * this.rpx2px + actionRelativeRect[side];
          tipPos += `${side}:${value}px;`;
        }
      }
      tipPos = tipPos || `top: ${actionRelativeRect.top-70*this.rpx2px}px; left:  ${actionRelativeRect.left-200*this.rpx2px}px;`;
      this.tipPosStr = tipPos;
      
      //指针（小手）
      let pointerPos = '';
      for (let side of ['top', 'bottom', 'left', 'right']){
        if (typeof this.options.pointer[side]==='number') {
          let value = this.options.pointer[side] * this.rpx2px + actionRelativeRect[side];
          pointerPos += `${side}:${value}px;`;
        }
      }
      pointerPos = pointerPos || `top: ${actionRelativeRect.top+actionRelativeRect.height-10*this.rpx2px}px; left:  ${actionRelativeRect.left+actionRelativeRect.width/2-127*this.rpx2px}px;`;
      this.pointerPosStr = pointerPos;
      
      //高亮区域
      let highlightExtend = String(this.options.highlightArea.extend).split(/\s+/).map(v=>Number(v));
      highlightExtend[1] = 2>highlightExtend.length ? highlightExtend[0] : highlightExtend[1];
      highlightExtend[2] = 3>highlightExtend.length ? highlightExtend[0] : highlightExtend[2];
      highlightExtend[3] = 4>highlightExtend.length ? highlightExtend[1] : highlightExtend[3]; 
      
      let highlightBorderRadius = this.options.highlightArea.borderRadius;
      highlightBorderRadius += typeof highlightBorderRadius==='number' ? 'rpx' : '';
      
      this.highlightAreaStyle = `
        top: ${this.actionRect.top-highlightExtend[0]*this.rpx2px}px;
        left: ${this.actionRect.left-highlightExtend[3]*this.rpx2px}px;
        width: ${this.actionRect.width+(highlightExtend[1]+highlightExtend[3])*this.rpx2px}px;
        height: ${this.actionRect.height+(highlightExtend[0]+highlightExtend[2])*this.rpx2px}px;
        border-radius: ${highlightBorderRadius};
      `;
    }
    
    /**
     * 展示新手引导
     * @param {Object} options 参见页面顶部使用说明及data中defaultOpts相关注释
     * @return {Promise<void>}
     */
    async open(options){
      //参数处理
      if (!options.eleId || !options.eleStyleRenderer) {
        console.error('[OperationGuideModal] bad parameter:', options);
        return;
      }
      this.options = deepAssign({}, deepClone(this.defaultOpts), options);
      
      //微信版本过低，不展示引导
      if (!wx.createSelectorQuery) 
        return;

      //调整操作区域z-index值和样式，使其展示于蒙层之上
      this.actionRect = await new Promise((resolve,reject)=>{
        wx.createSelectorQuery().select(`#${this.options.eleId}`).boundingClientRect(resolve).exec();
      });
      
      let eleStyle= `position: fixed; z-index: ${this.zIdx+1}; top: ${this.actionRect.top}px; left: ${this.actionRect.left}px;`;
      this.options.eleStyleRenderer(eleStyle);
      
      //展示蒙层
      this.calculateWidgetsStyle();
      this.show = true;
      this.$apply();

      //等待用户交互
      guideStatus.eleId = this.options.eleId;
      
      let listenActionStart =  new Promise((resolve,reject)=>{
        guideStatus.onActionStart = resolve;
      });
      
      let listenActionFinish = new Promise((resolve,reject)=>{
        guideStatus.onActionFinish = resolve;
      });

      //用户开始交互
      await listenActionStart;

      options.eleStyleRenderer(''); //恢复操作区域原始状态
      this.show = false;  //关闭蒙层
      this.$apply();

      //用户交互完毕
      await listenActionFinish;
      
      guideStatus.eleId = ''; //重置引导状态
      guideStatus.onActionStart = null;
      guideStatus.onActionFinish = null;
      
      //本次引导结束
    }
    
    onLoad(){
      this.$wxPromise.getSystemInfo().then(sysInfo=>{
        this.rpx2px = sysInfo.windowWidth/750;
        this.sysInfo = sysInfo;
        this.$apply();
      });
    }
    components = {}
  }
</script>

<style lang="less" rel="stylesheet/less">

</style>
<style lang="less" rel="stylesheet/less" scoped>
  @import (reference)"../../lib-style/common";
  
  @pointerMoveHalfDist: 10rpx;
  @keyframes pointLeft {
    0% {
      transform: translateX(0);
    }  
    25% {
      transform: translateX(-@pointerMoveHalfDist);
    }
    50% {
      transform: translateX(0);
    }
    75% {
      transform: translateX(@pointerMoveHalfDist);
    }
    100% {
      transform: translateX(0);
    }
  }
  @keyframes pointRight {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(@pointerMoveHalfDist);
    }
    50% {
      transform: translateX(0);
    }
    75% {
      transform: translateX(-@pointerMoveHalfDist);
    }
    100% {
      transform: translateX(0);
    }
  }
  @keyframes pointTop {
    0% {
      transform: translateY(0);
    }
    25% {
      transform: translateY(-@pointerMoveHalfDist);
    }
    50% {
      transform: translateY(0);
    }
    75% {
      transform: translateY(@pointerMoveHalfDist);
    }
    100% {
      transform: translateY(0);
    }
  }
  @keyframes pointBottom {
    0% {
      transform: translateY(0);
    }
    25% {
      transform: translateY(@pointerMoveHalfDist);
    }
    50% {
      transform: translateY(0);
    }
    75% {
      transform: translateY(-@pointerMoveHalfDist);
    }
    100% {
      transform: translateY(0);
    }
  }
  
  .modal {
    position: absolute;
    .takeFullSpace();
  }
  .highlightArea {
    position: fixed;
    box-shadow: 0 0 0 1000px rgba(0,0,0,0.7); //除操作区域外其余部分覆盖半透明蒙层
    //注：H5下建议用 clip-path+svg，不仅视觉上可以留出高亮区域，层级上也不会遮挡，对引导元素侵入更低
  }
  .guide {
    &.hand {
      .tip {
        position: fixed;

        font-size: 26rpx;
        color: #f9831b;
        line-height: 37rpx;
        white-space: pre-wrap;
        padding: 15rpx 26rpx;
        
        @tipBgColor: #fff7ee;
        @tipBorder: solid 2rpx #f9e44a;
        background: @tipBgColor;
        border-radius: 74rpx;
        border: @tipBorder;
        
        .triangle {
          width: 20rpx;
          height: 20rpx;
          border-radius: 4rpx;
          background: @tipBgColor;
          border-top: @tipBorder;
          border-right: @tipBorder;
          position: absolute;
          @verticalOffset: -10rpx;
          @horizontalOffset: 96rpx;
          &.topLeft {
            top: @verticalOffset;
            left: @horizontalOffset;
            transform: rotate(-45deg);
          }
          &.topRight {
            top: @verticalOffset;
            right: @horizontalOffset;
            transform: rotate(-45deg);
          }
          &.bottomLeft {
            bottom: @verticalOffset;
            left: @horizontalOffset;
            transform: rotate(135deg);
          }
          &.bottomRight {
            bottom: @verticalOffset;
            right: @horizontalOffset;
            transform: rotate(135deg);
          }
        }
        
      }
      .pointer {
        position: fixed;
        background: top/100% 100% no-repeat;
        &.left {
          width: 86rpx;
          height: 61rpx;
          background-image: url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/tree2/widgets/operationGuide/pointLeft.png");
          
          animation: pointLeft 1s infinite;
        }
        &.right {
          width: 86rpx;
          height: 61rpx;
          background-image: url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/tree2/widgets/operationGuide/pointRight.png");
          
          animation: pointRight 1s infinite;
        }
        &.top {
          width: 61rpx;
          height: 86rpx;
          background-image: url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/tree2/widgets/operationGuide/pointTop.png");
          
          animation: pointTop 1s infinite;
        }
        &.bottom {
          width: 61rpx;
          height: 86rpx;
          background-image: url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/tree2/widgets/operationGuide/pointBottom.png");
          
          animation: pointBottom 1s infinite;
        }
      }
    }
    &.bear {
      .tip {
        position: fixed;

        font-size: 24rpx;
        color: #6d6f73;
        font-weight: 500;
        line-height: 34rpx;
        white-space: pre-wrap;
        padding: 30rpx;
        
        background: #fff;
        border-radius: 35rpx;

        .triangle {
          width: 44rpx;
          height: 16rpx;
          background: url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/treasureHunt/misc/operationGuide/triangle.png") top / 100% 100% no-repeat;

          position: absolute;
          @verticalOffset: -14rpx;
          @horizontalOffset: 99rpx;
          &.topLeft {
            top: @verticalOffset;
            left: @horizontalOffset;
            transform: rotateX(180deg);
          }
          &.topRight {
            top: @verticalOffset;
            right: @horizontalOffset;
            transform: rotate(180deg);
          }
          &.bottomLeft {
            bottom: @verticalOffset;
            left: @horizontalOffset;
            transform: rotate(0);
          }
          &.bottomRight {
            bottom: @verticalOffset;
            right: @horizontalOffset;
            transform: rotateY(180deg);
          }
        }
      }
      .pointer {
        position: fixed;
        width: 126rpx;
        height: 160rpx;
        background:  url("https://img1.zhuanstatic.com/open/zhuanzhuan/zzwa/main/treasureHunt/misc/operationGuide/guider.png") top / 100% 100% no-repeat;
      }
    }
  }
</style>
