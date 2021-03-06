<template>
  <view class="dialog" v-if="show" @touchmove.stop="onScroll">
    <view class="dialog-mask"></view>
    <view class="dialog-container" :style="options.containerExtraStyle">
      <image class="dialog-icon" :class="options.icon ? options.icon.className : ''" v-if="options.icon" :src="options.icon.src"></image>
      <view class="dialog-container-close" v-if="!options.hideCloseIcon" @tap="onClose">
        <text class="dialog-container-close-x"></text>
      </view>
      <view class="dialog-container-title" :class="options.icon ? 'large-header' : ''">{{options.title || ''}}</view>
      <scroll-view :scroll-y="options.contentScrollable" class="dialog-container-content" :class="{'scrollable': options.contentScrollable}" :style="options.contentExtraStyle">{{options.content || ''}}</scroll-view>
      <view class="dialog-container-buttons" :class="[options.btnLayout, options.btnStyle, 'count'+options.buttons.length]">
        <view v-for="(button,index) in options.buttons" :key="text"
              :style="button.style"
              class="dialog-container-buttons-button" :class="button.main ? 'main' : ''"
              @tap="onButton(index, $event)">
          {{button.text}}
          <button :open-type="button.openType" :data-share-data="button.shareData"
                  @getphonenumber="onGetPhoneNumber(index, $event)"
                  @getuserinfo="onGetUserInfo(index, $event)"
                  @opensetting="onOpenSetting(index, $event)"
          >{{button.buttonText}}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import {deepClone} from '../lib/operationKit';
  import { Vue, Component, Prop } from 'vue-property-decorator'
  
  @Component
  export default class DialogCommon extends Vue {
    data(){
      return {
        show: false,

        options: {},
        defaultOptions: {
          title: '提示',   //标题
          content: '', //内容
          contentScrollable: 'auto',
          contentExtraStyle: '',
          containerExtraStyle:'',
          // 头部icon
          // icon: {
          //   src: 'https://img.58cdn.com.cn/zhuanzhuan/zzwa/main/group/wrong.png',
          //   className: 'modal-icon'
          // },
          hideCloseIcon: false,  //是否隐藏右上角关闭按钮
          onClose: null,   // 关闭按钮回调
          btnLayout: 'horizontal', //按钮版式， 'horizontal'-水平铺开（默认），'vertical'-垂直铺开
          btnStyle: 'highlight',   //按钮风格， 'highlight'-主按钮高亮，'common'-各按钮相同
          buttons: [  //按钮列表，个数建议为1到2个
            {
              text: '确定', //按钮文案
              // style: ''   // 按钮自定义样式，直接加到style属性中，优先级高
              openType: '', //按钮元素的open-type属性，可选值同原生<button>组件open-type属性
              shareData: '',//按钮元素的data-share-data属性值，便于设置分享数据
              clickHandler: null, //点击回调
              preventClose: false,  //点击后是否阻止对话框关闭
            },
          ],
        },
      }
    }

    onClose(){
      this.close();
      typeof this.options.onClose === 'function' && this.options.onClose();
    }
    onButton(idx, ev){
      let button = this.options.buttons[idx];
      if (['getPhoneNumber','getUserInfo','openSetting'].includes(button.openType)) { //特殊按钮在特殊事件中处理，不在此处回调
        if (!button.preventClose)
          this.close();
        return;
      }

      this.handleBtn(button, ev);
    }
    onGetPhoneNumber(idx, ev){
      this.handleBtn(this.options.buttons[idx], ev);
    }
    onGetUserInfo(idx, ev){
      this.handleBtn(this.options.buttons[idx], ev);
    }
    onOpenSetting(idx, ev){
      this.handleBtn(this.options.buttons[idx], ev);
    }
    onScroll(){}

    handleBtn(button, ev){
      typeof button.clickHandler === "function" && button.clickHandler(Object.assign({}, button), ev);
      this.show = !!button.preventClose;
    }

    close(){
      this.show = false;
    }
    /**
     * 打开弹窗
     * @public
     * @param {Object} options {
        title: '提示',   //标题
        content: '', //内容
        contentScrollable: 'auto', //内容是否可滚动，true-定高滚动，false-高度随内容伸展，'auto'-根据文案行数&字数自动判断
        contentExtraStyle: '', //内容额外样式，格式同元素内联样式
        containerExtraStyle:'',//container额外样式
        hideCloseIcon: false,  //是否隐藏右上角关闭按钮
        btnLayout: 'horizontal', //按钮版式， 'horizontal'-水平铺开（默认），'vertical'-垂直铺开
        btnStyle: 'highlight',   //按钮风格， 'highlight'-主按钮高亮（默认），'common'-各按钮相同
        buttons: [  //按钮列表，个数建议为1到2个
          {
            text: '确定', //按钮文案
            openType: '', //按钮元素的open-type属性，可选值同原生<button>组件open-type属性
            shareData: '',//按钮元素的data-share-data属性值，便于设置分享数据
            clickHandler: null, //点击回调
            preventClose: false,  //点击后是否阻止对话框关闭
          },
        ],
      },
     }
     */
    open(options){
      let opts = Object.assign({}, this.defaultOptions, options);
      opts.buttons = opts.buttons.map((btn,idx,arr)=> {
        return Object.assign({},
          this.defaultOptions.buttons[idx] || this.defaultOptions.buttons[0],
          typeof btn==='string' ? {text: btn} : btn,
          {
            main: opts.btnLayout==='horizontal'&&arr.length===2 ? idx===1 : idx===0,
          }
        );
      });

      if (opts.contentScrollable=='auto') //当文案行数/字数过多时，定高滚动展示；内容较少时，高度随内容伸展
        opts.contentScrollable = opts.content.split('\n').length>=7 || opts.content.length>=18*7;

      this.options = opts;

      this.show = true;
    }

    /**
     * 打开弹窗，功能同open函数，以Promise形式调用
     * @public
     * @param options 同open函数
     * @return {Promise} resolve为按钮回调函数执行结果 （不关闭弹窗的按钮不予考虑）
     * @example
     async function goBind() {
        let bindRes = await this.$invoke('DialogCommon','asyncOpen',{
          title: '绑定手机号',
          content: '共建真实、安全二手交易环境\n转转承诺不会滥用您提供的信息',
          onClose: ()=>{ return {result: 'fail'}; },
          buttons: [{
            text: '查看用户协议',
            preventClose: true,
            clickHandler: ()=>{
              wx.navigateTo({url: '/pages/userrules/userrules'});
            },
          }, {
            text: '立即绑定',
            openType: 'getPhoneNumber',
            clickHandler: ()=>{
              //....
              return {result: 'success'};
            },
          }],
        });

        //统一处理弹窗各交互路径交互结果，如： 弹窗-关闭图标、弹窗-立即绑定、弹窗-查看用户协议-关闭图标、弹窗-查看用户协议-立即绑定等
        if (bindRes.result == 'success') //绑定成功，正常进行后续操作
          ;  //....
        else //绑定失败
          ; //....
      }
     */
    asyncOpen(options){
      return new Promise((resolve, reject)=>{
        let asyncOpts = deepClone(options);

        asyncOpts.onClose = async function(...args){
          let res = options.onClose ? options.onClose.apply(this, args) : {};
          resolve(res);
        };

        asyncOpts.buttons.forEach((btn, idx)=>{
          btn.clickHandler = async function(...args){
            let res = options.buttons[idx].clickHandler ? options.buttons[idx].clickHandler.apply(this, args) : {};
            if (!btn.preventClose)
              resolve(res);
          }
        });
        this.open(asyncOpts);
      });
    }
  }
</script>

<style lang="less" rel="stylesheet/less" scoped>
  @import "../lib-style/common";
  
  button { /*目前页内转发只能使用button组件，但样式需自定义，故此处对button默认样式进行清理*/
    .clear();
  }

  .dialog{
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1800;
    &-mask{
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      background-color: #000000;
      opacity: .6;
    }
    &-container{
      position: absolute;
      top: 300rpx;
      left: 57rpx;
      width: 640rpx;
      border-radius: 5rpx;
      background-color: #ffffff;
      text-align: center;
      font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      &-close{
        display: block;
        position: absolute;
        padding: 15rpx 30rpx;
        right: 0;
        top: 0;
        &-x{
          display:inline-block;

          width: 30rpx;
          height: 2rpx;
          background: #999;
          font-size: 0;
          line-height: 0;
          vertical-align: middle;
          -webkit-transform: rotate(45deg);
        }
        &-x::after{
          content:'.';
          display: block;
          width: 30rpx;
          height: 2rpx;
          background: #999;
          -webkit-transform: rotate(-90deg);
        }
      }
      &-title{
        font-size: 36rpx;
        font-weight: 500;
        line-height: 1;
        color: #43474c;
        padding: 64rpx 0 28rpx;
      }
      .large-header{
        padding-top: 159rpx;
      }
      &-content{
        &.scrollable {
          height: 354rpx;
          text-align: left;
        }
        font-size: 30rpx;
        color: #aaaeb9;
        font-weight: 400;
        line-height: 46rpx;
        box-sizing: border-box;
        padding: 0 46rpx 52rpx 48rpx;
        white-space: pre-wrap;
      }
      &-buttons{
        position: relative;
        .border-top(solid, #f1f1f1);
        overflow: hidden;
        &-button{
          height: 110rpx;
          font-size: 36rpx;
          color: #43474c;
          font-weight: 400;
          line-height: 110rpx;
          box-sizing: border-box;
          text-align: center;
          position: relative;
          button {
            position: absolute;
            .takeFullSpace();
          }
        }
        &.horizontal.count2 &-button {
          width: 50%;
          float: left;
          &:nth-child(1){
            position: relative;
            .border-right(solid, #f1f1f1);
          }
        }
        &.vertical &-button {
          &:not(:last-child) {
            position: relative;
            .border-bottom(solid, #f1f1f1);
          }
        }
        &.highlight &-button.main {
          color: #6DA5FF;
        }
      }
    }
  }
</style>
