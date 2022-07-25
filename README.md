<!--
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 15:55:14
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-07-18 16:27:59
 * @FilePath: /WeChatProjects/Users/yiyang/Sites/self/RecycleList-Component/README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
为了解决组件无限滚动加载问题。


#### 无限滚动组件的使用方法：
wxml： 在父级组件的wxml里面插入组件，并设置好一个id： <RecycleList id="my_recycle"></RecycleList>
js： 在父组件的 onPageScroll 和 onReachBottom 事件里面分别调用组件内部方法，如：

throttle 方法是一个节流函数，可以自己实现一个。

...
// 页面滚动
  onPageScroll(res) {
    this.throttle(res, this);
  },
  throttle: throttle(function (res, that) {
    // 无限不能动-滚动调用组件函数， my_recycle 为组件id
    let myRecycle = that.selectComponent('#my_recycle');
    myRecycle.getPageScrollTop();
  }, 100, true),

  // 页面触底事件
  onReachBottom(){
    // // 无限不能动-获取组件并触发组件内触底加载函数， my_recycle 为组件id
    let myRecycle = this.selectComponent('#my_recycle');
    myRecycle.getFeeds();
  },
...


注意：
1、一个页面只能使用一个无限滚动组件，否则会有问题。
2、无限滚动内部需要无限展示的元素高度必须一致，所以不支持瀑布流



#### 一行多个item元素：默认1
<RecycleList id="my_recycle" columnNumber="{{2}}"></RecycleList>

#### 自定义无限滚动id：默认 recycleList-content
<RecycleList id="my_recycle" recycleListContentId="id1"></RecycleList>


demo: https://developers.weixin.qq.com/s/d6mFVQmR7fAV