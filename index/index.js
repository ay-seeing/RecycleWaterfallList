// import { throttle, debounce, NavigateTo } from "util";

const app = getApp();

function debounce(fn, delay, immediate) {
  return throttle(fn, delay, immediate, true);
}

function throttle(fn, delay, immediate, debounce) {
  let last_call = 0;
  let last_exec = 0;
  let curr = Number(new Date()); //当前事件
  let timer = null;
  let diff; //时间差
  let context; //上下文
  let args;
  let exec = function () {
    last_exec = curr;
    fn.apply(context, args);
  };
  return function () {
    curr = Number(new Date());
    context = this;
    args = arguments;
    diff = curr - (debounce ? last_call : last_exec) - delay;
    clearTimeout(timer);
    if (debounce) {
      if (immediate) {
        timer = setTimeout(exec, delay);
      } else if (diff >= 0) {
        exec();
      }
    } else {
      if (diff >= 0) {
        exec();
      } else if (immediate) {
        timer = setTimeout(exec, -diff);
      }
    }
    last_call = curr;
  };
}


//Page d
Page({
  data: {
    apiInfo: {
      count: 20,
    }
  },

  onLoad(options) {
    console.log('代码片段是一种迷你、可分享的小程序或小游戏项目，可用于分享小程序和小游戏的开发经验、展示组件和 API 的使用、复现开发问题和 Bug 等。可点击以下链接查看代码片段的详细文档：')
    console.log('https://mp.weixin.qq.com/debug/wxadoc/dev/devtools/devtools.html')
  },
  onReady(){
    
  },
  onShow() {
  },
  onShareAppMessage(){

  },
  // 下拉刷新
  // onPullDownRefresh: debounce(function () {
  //   wx.stopPullDownRefresh();
  // }, 300, true),

  // 页面滚动
  onPageScroll(res) {
    this.throttle(res, this);
  },
  throttle: throttle(function (res, that) {
    // 无限列表-滚动调用组件函数， my_recycle 为组件id
    let myRecycle = that.selectComponent('#my_recycle');
    myRecycle.getPageScrollTop();
  }, 100, true),

  // 页面触底事件
  onReachBottom(){
    wx.getStorageSync('debug') && console.log('page----', '触底')
    // 无限列表-获取组件并触发组件内触底加载函数， my_recycle 为组件id
    let myRecycle = this.selectComponent('#my_recycle');
    myRecycle.getDatas();
  },

  changeApi(){
    console.log(999)
    this.setData({
      apiInfo: {
        ...this.apiInfo,
        count: 30,
      }
    })
  },

  // handlTest(){
    // console.log(this.apiData)
    // console.log(99)

    // let pageTopNumber = 0;
    // var query = wx.createSelectorQuery()
    // query.select('#RecycleList').boundingClientRect(function (res) {
    //   pageTopNumber = res.top;
    // }).exec();

    // var query2 = wx.createSelectorQuery()
    // query2.select('#viewlist').boundingClientRect(function (res) {
    //   self.diffHeight = Math.abs(pageTopNumber-res.top);

    //   console.log(self.diffHeight)
    // }).exec();
  // },
});