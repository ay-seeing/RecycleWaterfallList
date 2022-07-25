/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-07-25 18:14:51
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
2、不支持瀑布流
3、如果要使用一行多个，最好是使用等高，如果不等高可能会有UI显示问题
4、如果需要支持锚点，则必须是等高，否则没办法进行计算（目前还不支持锚点定位功能）



一行多个：
<RecycleList id="my_recycle" columnNumber="{{2}}"></RecycleList>

自定义无限滚动id：
<RecycleList id="my_recycle" recycleListContentId="id1"></RecycleList>

参数说明：
apiInfo    必填, api请求的一些参数，因为接口的 url 是必填
id    必填，组件的id，用于父组件调用组件内部方法
columnNumber    选填，默认 1
hasWaterfall    选填， 是否是瀑布流
hasContour    选填，默认 true
recycleListContentId   选填，组件内交互id，随意填写

*/
Component({
    options: {
      multipleSlots: true, // 在组件定义时的选项中启用多slot支持
      pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
    },
    properties: {
        apiInfo: {   // api相关信息
            url: {
                type: String,
                value: '',
            },
            apiData: {  // 除翻页外的其他接口参数，但不包含 offset 和 limit
                type: Object,
                value: {},
            },
            count: {  // 每页几个
                type: Number,
                value: 30,
            },
        },
        hasWaterfall: {  // 实发瀑布流
            type: Boolean,
            value: false,
        },
        columnNumber: { // 一行显示几个
            type: Number,
            value: 1
        },
        recycleListContentId: { // 无限列表id
            type: String,
            value: 'recycleList-content'
        },
        hasContour: {   // 里面的每个item是否是等高的
            type: Boolean,
            value: true,
        }
        // temp: null
    },
    lifetimes: {
        // 组件初始化生命周期-组件初始化完成
        attached: function() {
            const self = this;
            // 获取可视区域高度
            wx.getSystemInfo({
                success: (res) => {
                self.data._showHeight = res.windowHeight;
                // console.log(res.windowHeight)
                },
                fail: ()=>{}
            });
        
            // 获取数据
            this.getFeeds();
        }
    },
    data: {
        hasMore: true,
        leftFallData: [],
        rightFallData: [],
        listData: [],   // 将数据处理成二维数组
        scrollPageNumber:0,   // 可视区域的页码
        turnPageHeight: 0, // 无限翻页，每页的高度
        hasLoading: false,   // 是否正在获取数据

        // testBeforeHeight: 1000,  // 用于测试，无限滚动前面的元素高度

        // 以下为纯数据字段
        _bakScrollPageNumber: 0,   // 上一次的页码，主要是用来对比页码是否改变更换数据
        _height: 0,   // 第一个子模块的高度
        _bakListData: [],  // 数据备份
        _currentPageNumber:0,  // 最后一次请求接口的页码
        _showHeight: 0, // 可视区域高度
        _diffHeight: 0,  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
        _apiData: { "limit": 30, "offset": 0 },
    },
    observers: {  // 数据变化监听
        'apiInfo': function(opt){
            console.log('this.data._apiData--', opt)
            this.setData({
                _apiData: {
                    ...this.data._apiData,
                    limit: opt.count,
                },
            })
        },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        // 获取圈子数据方法
        async getFeeds() {
            wx.getStorageSync('debug') && console.log('component----', '加载数据-start')
            // 如果没有更多，则直接返回
            // 判断如果正在加载，则进行节流处理，不请求下一次的接口请求
            if (!this.data.hasMore || this.data.hasLoading) {
                return;
            }

            wx.getStorageSync('debug') && console.log('component----', '加载数据-ing',)
            // console.log('this.data._apiData', this.data._apiData)
            let curentP = this.data._apiData.offset/this.data._apiData.limit;
            // 请求接口前设置loading状态
            // this.data.hasLoading = true;
            this.setData({
                hasLoading: true,
            });

            // 使用promise模拟接口请求
            await new Promise((res, rej) => {
                setTimeout(()=>{
                    // this.data.hasLoading=false;
                    this.setData({
                        hasLoading: false,
                    });
                    res();
                }, 200)
            });
            wx.getStorageSync('debug') && console.log('component----', '加载数据-end')
            
            // 请求接口
            let resp = {};

            // 模拟数据处理-start
            let testList = [];
            for(var i=0;i < this.data._apiData.limit;i++){
                testList.push({
                    // item数据
                })
            }
            resp = {
                error_num: 0,
                content: {
                    result1: testList,
                }
            }
            // 模拟数据处理-end

            let { content } = resp;
            if (resp.error_num === 0 && content) {
                let list = content.result1;

                // 当前页数
                this.data._currentPageNumber = curentP;

                // 数据处理，给每条数据标识上页码
                list.forEach((item)=>{
                    item.pageNumber = this.data._currentPageNumber;
                })

                // 将数据存储起来
                this.data._bakListData[this.data._currentPageNumber] = {
                    list,
                }
                // }

                // 更新请求页码
                this.data._apiData.offset += this.data._apiData.limit;

                
                this.setData({
                    hasMore: true,
                }, async ()=>{
                    
                });

                // 根据不能动页码获取需要显示的数据
                this.getShowData();
            } else {
                this.setData({
                    hasMore: false,
                });
            }
        },
        // 根据滚动页码获取需要显示数据
        getShowData(){
            let listData = []
            // 设置数据有多少页
            // listData.length = this.data._bakListData.length;
            // 将备份数据里面的存储dom高度的对象给 listData，用于后面渲染设置高度
            this.data._bakListData.forEach((item, i)=>{
                let {dom} = item;
                listData[i] = {
                    dom,
                }
            });


            // 根据页码获取当前页码前后1页的数据，将对应页码的数据全部替换掉
            if(this.data.scrollPageNumber>=1){
                listData[this.data.scrollPageNumber-1] = this.data._bakListData[this.data.scrollPageNumber-1];
            }
            if(this.data._bakListData[this.data.scrollPageNumber]){
                listData[this.data.scrollPageNumber] = this.data._bakListData[this.data.scrollPageNumber];
            }

            if(this.data._bakListData[this.data.scrollPageNumber+1]){
                listData[this.data.scrollPageNumber+1] = this.data._bakListData[this.data.scrollPageNumber+1];
            }

            // 将最近的3页数据显示出来
            this.setData({
                listData: listData,
                // 计算对应某一页的高度
                turnPageHeight: this.data._height ? this.data._height * (this.data._apiData.limit/ this.data.columnNumber) : 0,
            }, async ()=>{
                // 当未获取到高度的时候采取获取，如果已经获取到了就不需要再去获取高度了
                !this.data._height &&  await this.getItemHeight();

                // 判断是否是不等高子元素，如果是不等高子元素，则需要获取page高度，那么每页的高度就不通过第一个item去计算得到了，这里就需要获取下上一页的高度
                // console.log('this.data._currentPageNumber---', this.data._currentPageNumber, this.data._bakScrollPageNumber)
                if(!this.data.hasContour){
                    console.log('不等高')
                    // if(this.data._currentPageNumber > 0){
                    //     this.getPrevPageHeight(this.data._currentPageNumber-1);
                    // }
                    await this.getPrevPageHeight(this.data._currentPageNumber);
                    // console.log('this.data._bakListData---', JSON.parse(JSON.stringify(this.data._bakListData)))
                }else if(!this.data.turnPageHeight){
                    console.log('等高')
                    // this.setData({
                    //     // 计算对应某一页的高度
                    //     turnPageHeight: this.data._height ? this.data._height * (this.data._apiData.limit/ this.data.columnNumber) : 0,
                    // });

                    this.data._bakListData[this.data._currentPageNumber].dom ={
                        height: this.data.turnPageHeight,
                    }
                }else{
                    console.log('等高')
                    // if(this.data._currentPageNumber > 0){
                    //     this.data._bakListData[this.data._currentPageNumber -1].dom ={
                    //         height: this.data.turnPageHeight,
                    //     }
                    // }
                    // console.log('this.data._bakListData---',this.data.turnPageHeight, JSON.parse(JSON.stringify(this.data._bakListData)))
                    this.data._bakListData[this.data._currentPageNumber].dom ={
                        height: this.data.turnPageHeight,
                    }
                }
            }, 100)
        },

        // 获取单个元素的高度
        async getItemHeight(){
            let self = this;
            var query = this.createSelectorQuery();
            let dom = query.select('.recycleList-item');
            if(dom){
                await new Promise((resolve, reject)=>{
                    dom.boundingClientRect(function (res2) {
                        if(res2){
                            self.data._height = res2.height;
                        }
                        resolve();
                    }).exec();
                })
            }
        },

        // 获取上一页的高度
        async getPrevPageHeight(pageN){
            let self = this;
            // var query = this.createSelectorQuery();
            // // console.log('----', '.item-page-'+pageN)
            // let dom = query.select('.item-page-'+pageN);
            // if(dom){
            //     await new Promise((resolve, reject)=>{
            //         dom.boundingClientRect(function (res2) {
            //             if(res2){
            //                 self.data._bakListData[pageN].dom = {
            //                     height: res2.height,
            //                 }
            //             }
            //             resolve();
            //         }).exec();
            //     })
            // }
            let a = await this.getDomHeight('.item-page-'+pageN);
            if(a){
                this.data._bakListData[pageN].dom = {
                    height: a.height,
                }
            }
        },

        // 获取元素高度
        async getDomHeight(str){
            let self = this;
            var query = this.createSelectorQuery();
            // console.log('----', '.item-page-'+pageN)
            let dom = query.select(str);
            if(dom){
                await new Promise((resolve, reject)=>{
                    dom.boundingClientRect(function (res2) {
                        resolve(res2);
                    }).exec();
                })
            }
        },

        // 获取滚动高度，来计算当前页码
        getPageScrollTop(){
            let self = this;

            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}`).boundingClientRect(function (res) {
                // console.log('self.data._diffHeight', self.data._diffHeight, self.data._showHeight, res.top)
                // 根据页面显示区域的底部位置计算当前是多少页
                let scrollP = 0;
                // 判断是否是等高，如果等高则直接计算，不等高则进行轮询，其实等高走轮询也行，为了优化性能，可以直接计算
                if(self.data.hasContour){
                    scrollP = Math.floor(Math.abs(res.top-self.data._showHeight+self.data._diffHeight)/self.data._height/(self.data._apiData.limit/self.data.columnNumber));
                }else{
                    let offsetTop = Math.abs(res.top-self.data._showHeight+self.data._diffHeight);
                    self.data._bakListData.forEach((item, i)=>{
                        if(item.dom && offsetTop >= 0){
                            scrollP = i;
                            offsetTop -= item.dom.height;
                        }
                    });
                    // console.log('scrollP---', scrollP)
                }

                // 判断上一次的备份页码和现在计算出来的页码是否相同，如果相同就不做处理（目的优化性能）
                if(self.data._bakScrollPageNumber === scrollP){
                    return;
                }

                // 获取当前的scroll页码，这和接口请求的当前页面不一样
                // 根据滚动位置和单个模块高度以及每页多少个来计算当前是第几页
                self.data._bakScrollPageNumber = scrollP;

                self.setData({
                    scrollPageNumber : scrollP,
                }, ()=>{
                    // 获取显示的页码数据
                    self.getShowData();
                    // console.log(self.data.scrollPageNumber)
                })
            }).exec();
        },

        // 无限滚动列表内部，所有滚动元素前面的元素高度有变化后需要调用下修正差值，也就是在 #recycleList-content 内部，第一个 recycleList-item 前面的元素
        getScrollAfterHeight(){
            let self = this;
            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}-before`).boundingClientRect(function (res) {
                self.data._diffHeight = res.height;
                // console.log()
            }).exec();
        },

        beforeChangeHeight(){
            // this.setData({
            //     testBeforeHeight: this.data.testBeforeHeight + 100,
            // }, ()=>{
            //     // this.getScrollAfterHeight();
            // });
        },
    }
  });
  
  