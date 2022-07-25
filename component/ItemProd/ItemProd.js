/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-07-21 17:28:20
 * @FilePath: /WeChatProjects/ComponentLongList/component/RecycleList/RecycleList.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* 

无限滚动组件的使用方法：
wxml： 在父级组件的wxml里面插入组件，并设置好一个id： <RecycleList id="my_recycle"></RecycleList>
js： 在父组件的 onPageScroll 和 onReachBottom 事件里面分别调用组件内部方法，如：
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



一行多个：
<RecycleList id="my_recycle" columnNumber="{{2}}"></RecycleList>

自定义无限滚动id：
<RecycleList id="my_recycle" recycleListContentId="id1"></RecycleList>
*/
Component({
    options: {
    //   multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    //   pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
    },
    properties: {
        item: {
            type: Object,
            value: {},
        },
        columnNumber: { // 一行显示几个
            type: Number,
            value: 1
        },
        recycleListContentId: { // 无限列表id
            type: String,
            value: 'recycleList-content'
        },
    },
    lifetimes: {
        // 组件初始化生命周期-组件初始化完成
        attached: function() {
            // console.log(this.data)
        }
    },
    data: {
        
    },
  
    /**
     * 组件的方法列表
     */
    methods: {
        
    }
  });
  
  