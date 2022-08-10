/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-08-09 16:07:39
 * @FilePath: /WeChatProjects/ComponentLongList/component/RecycleList/RecycleList.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* 

无限滚动组件的使用方法：
wxml： 在父级组件的wxml里面插入组件，并设置好一个id： <RecycleWaterfallList id="my_recycle"></RecycleWaterfallList>
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
    myRecycle.getDatas();
  },
...


注意：
1、一个页面只能使用一个无限滚动组件，否则会有问题。
2、因为是瀑布流，所以在渲染速度方面会稍慢一些
3、scroll-outer-after 内容不能太高，否则会有计算问题



自定义无限滚动id：
<RecycleWaterfallList id="my_recycle" recycleListContentId="id1"></RecycleWaterfallList>

参数说明：
apiInfo    必填, api请求的一些参数，因为接口的 url 是必填
id    必填，组件的id，用于父组件调用组件内部方法
recycleListContentId   选填，组件内交互id，随意填写
columnNumber    选填，瀑布流的列数，默认2，目前组件css样式支持2-4列，大于4列需要自己写css样式

*/
Component({
    options: {
      multipleSlots: true, // 在组件定义时的选项中启用多slot支持
      pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
      styleIsolation: 'apply-shared',
    },
    properties: {
        apiInfo: {   // api相关信息
            type: Object,
            value: {
                url: '',
                apiData: { }, // 除翻页外的其他接口参数，但不包含 offset 和 limit
                count: 30,  // 每页几个
            }
        },
        columnNumber: { // 几列，默认2列
            type: Number,
            value: 2
        },
        recycleListContentId: { // 无限列表id
            type: String,
            value: 'recycleWaterList-content'
        },
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
            this.getDatas();
        }
    },
    data: {
        hasMore: true,
        listData: [],   // 渲染数据
        /* listData数据格式
        [
            // 第一列
            [{height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}],
            // 第二列
            [{height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}],
            ...
        ] 
        */
        scrollPageNumber:0,   // 可视区域的页码
        hasLoading: false,   // 是否正在获取数据
        invisibleList: [], // 不可见list渲染



        // -------------------以下为纯数据字段----------------------

        _bakScrollPageNumber: 0,   // 上一次的页码，主要是用来对比页码是否改变更换数据
        _bakListData: [],  // 数据备份
        // _bakListData 数据格式
        // [
        //     [  // 第一页
        //         {height: xxx, list: []},   // 第一页的第一列
        //         {height: xxx, list: []},    // 第一页的第二列
        //         ...
        //     ],
        //     [  // 第二页
        //         {height: xxx, list: []},  // 第二页的第二列
        //         {height: xxx, list: []}, // 第二页的第二列
        //         ...
        //     ],
        //     ...
        // ]
        _currentPageNumber:0,  // 最后一次请求接口的页码
        _showHeight: 0, // 可视区域高度
        _diffHeight: 0,  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
        _apiData: { "limit": 30, "offset": 0 },
        _hasWaterfallRenderEnd: true,   // 瀑布流是否渲染结束
    },
    observers: {  // 数据变化监听
        'apiInfo': function(opt){
            // console.log('this.data._apiData--', opt)
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
        init(){
            // 以下为纯数据字段
            this.data._bakScrollPageNumber = 0,   // 上一次的页码，主要是用来对比页码是否改变更换数据
            this.data._bakListData = [],  // 数据备份
            this.data._currentPageNumber =0,  // 最后一次请求接口的页码
            this.data._diffHeight = 0,  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
            this.data._apiData = {
                ...this.data._apiData,
                offset: 0,
            } || { "limit": 30, "offset": 0 },
            this.data._hasWaterfallRenderEnd = true,   // 瀑布流是否渲染结束

            // 以下是需要渲染的数据
            this.setDate({
                hasMore: true,
                listData: [],   // 渲染的数据
                scrollPageNumber:0,   // 可视区域的页码
                hasLoading: false,   // 是否正在获取数据

                invisibleList: [], // 不可见list渲染
            }, ()=>{
                // 获取数据
                this.getDatas();
            });
        },
        // 获取圈子数据方法
        async getDatas() {
            wx.getStorageSync('debug') && console.log('component----', '加载数据-start', this.data.hasMore, this.data.hasLoading, this.data._hasWaterfallRenderEnd)
            // 如果没有更多，则直接返回
            // 判断如果正在加载，则进行节流处理，不请求下一次的接口请求
            if (!this.data.hasMore || this.data.hasLoading) {
                return;
            }

            // 如果还在渲染，则300ms后再执行
            if(!this.data._hasWaterfallRenderEnd){
                setTimeout(()=>{
                    this.getDatas();
                }, 300);
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
                }, 1000)
            });
            wx.getStorageSync('debug') && console.log('component----', '加载数据-end')

            // const res = await app.$fetch({
            // url: this.data.apiInfo.url,
            // data: {
            //     ...this.data.apiInfo.apiData,
            //     pageParameter: JSON.stringify(this.data._apiData)
            // },
            // showLoading: true,
            // });
            // if (res.error_num === 0 ) {}
            
            // 请求接口
            let resp = {};

            // 模拟数据处理-start
            let testList = [];
            for(var i=0;i < this.data._apiData.limit;i++){
                testList.push({
                    // item数据
                    height: Math.floor(Math.random()*200) + 100,
                    num: i,
                });
            }
            resp = {
                error_num: 0,
                content: {
                    list: testList,
                }
            }
            // 模拟数据处理-end

            let { content } = resp;
            if (resp.error_num === 0 && content) {
                let list = content.list || {};

                // 当前页数
                this.data._currentPageNumber = curentP;

                // 数据处理，给每条数据标识上页码
                list.forEach((item)=>{
                    item.pageNumber = this.data._currentPageNumber;
                });

                // 更新请求页码
                this.data._apiData.offset += this.data._apiData.limit;

                
                this.setData({
                    hasMore: true,

                }, async ()=>{
                    
                });

                // 将新获得的数据进行瀑布流渲染
                await this.waterfallRender(list);

                // 瀑布流渲染后，根据页码获取对应的需要显示的数据
                this.getShowData();
            } else {
                this.setData({
                    hasMore: false,
                });
            }
        },
        // 瀑布流渲染
        waterfallRender(list){
            let self = this;
            // 如果没有数据则不进行瀑布流渲染
            if (list.length <= 0) {
                return;
            }

            // 开始渲染瀑布流标识
            this.data._hasWaterfallRenderEnd = false;

            return new Promise((resolve, reject)=>{
                this.setData({
                    invisibleList: list,
                }, ()=>{
                    let waterFallInvisible = '#' + this.data.recycleListContentId + '-render';
                
                    let query = self.createSelectorQuery();
                    // console.log(this.data.recycleListContentId + '-fallLeft')

                    // 循环获取每列的高度
                    let column=0
                    for(column; column < this.data.columnNumber;column++){
                        query.select('#' + this.data.recycleListContentId + '-' + column).boundingClientRect();
                    }

                    query.selectAll(`${waterFallInvisible} .invisible-item`).boundingClientRect();
                    query.exec((res) => {
                        // console.log('res---1----', res, res[2])
                        if(res){
                            let listH = [];  // 每列的高度
                            let currentPagetH = [];  // 当前页所有列里面的元素总高度
                            let currentListData = {};   // 每列的数据

                            // 渲染时，重置当前页的高度
                            let column2 = 0;
                            for(column2; column2 < self.data.columnNumber;column2++){
                                if(!res[column2]){
                                    console.log('dom不存在，需要排查问题');
                                }
                                listH[column2] = res[column2].height;
                                currentPagetH[column2] = 0;
                                currentListData[column2] = {};
                            }

                            // 所有单个元素的列表
                            let arrayListH = res[self.data.columnNumber];

                            // 训话当前页码所有的单元元素列表，根据高度计算出每个item应该放在哪一行
                            let i=0
                            for(i;i<arrayListH.length;i++){
                                // console.log('i', arrayListH[i])
                                let item = list[i];

                                let targetColumn = 0;  // 标识哪列最矮

                                // 高度对比
                                let columnDiffH = [];
                                listH.forEach((item, i)=>{
                                    columnDiffH[i] = item + currentPagetH[i];
                                    // console.log()
                                });
                                targetColumn = self.getArrayMin(columnDiffH);

                                currentPagetH[targetColumn] += arrayListH[i].height;

                                // console.log('---targetColumn---', i, targetColumn)

                                // 插入数据
                                let l = 0;
                                for(l; l<self.data.columnNumber;l++){
                                    // 判断当前列表当前页码是否存在列表，如果不存在则初始化一个
                                    if(!currentListData[l].list){
                                        currentListData[l].list = [];
                                    }
                                }
                                currentListData[targetColumn].height = currentPagetH[targetColumn];
                                currentListData[targetColumn].list.push(item);
                                
                            }

                            // 判断当前页面是否有备份数据，如果没有则添加进去
                            if(!this.data._bakListData[this.data._currentPageNumber]){
                                this.data._bakListData[this.data._currentPageNumber] = currentListData;
                            }

                            // console.log(211111, this.data._bakListData)
                            // 标注瀑布流渲染结束
                            this.data._hasWaterfallRenderEnd = true;

                            resolve();
                        }
                    })
                });
            });
        },
        // 获取数组中最小数字的下标
        getArrayMin(arr) {
            let min = arr[0];
            let indexN = 0;
            let i = 0;
            for (i; i < arr.length; i++) {
                if (min > arr[i]) {
                    min = arr[i];
                    indexN = i;
                }
            }
        
            return indexN;
        },
        // 根据滚动页码获取需要显示数据
        getShowData(){
            // console.log('this.data._hasWaterfallRenderEnd--', this.data._hasWaterfallRenderEnd, this.data.scrollPageNumber, this.data._bakListData)
            // 如果还在进行瀑布流渲染，则不让重新计算，否则会有问题
            if (!this.data._hasWaterfallRenderEnd) {
                return;
            }

            let listData = [];  
            /* listData数据格式
            [
                // 第一列
                [{height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}],
                // 第二列
                [{height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}, {height: xxx, list: []}],
                ...
            ] 
            */

            // 先分列
            let c=0
            for(c; c < this.data.columnNumber;c++){
                listData[c]=[];
            }

            // 轮训，将对应的数据高度和初始化list放到对应的分列的对应页码上，目的是将不需要渲染的页码数据设置高度，让其占据对应的高度
            this.data._bakListData.forEach((item, i)=>{
                let column=0
                for(column; column < this.data.columnNumber;column++){
                    if(!listData[column][i]){
                        listData[column][i] = {};
                    }
                    listData[column][i].height = item[column].height;
                    listData[column][i].list = [];
                }
            });

            // console.log('this.data._bakListData----2', this.data._bakListData);

            // 根据页码获取当前页码前后1页的数据，将对应页码的list数据赋值给对应的需要显示的页码数据list上
            if(this.data.scrollPageNumber>=1){
                let c1=0
                for(c1; c1 < this.data.columnNumber;c1++){
                    listData[c1][this.data.scrollPageNumber-1].list = this.data._bakListData[this.data.scrollPageNumber-1][c1].list;
                }
            }
            if(this.data._bakListData[this.data.scrollPageNumber]){
                let c1=0
                for(c1; c1 < this.data.columnNumber;c1++){
                    listData[c1][this.data.scrollPageNumber].list = this.data._bakListData[this.data.scrollPageNumber][c1].list;
                }
            }

            if(this.data._bakListData[this.data.scrollPageNumber+1]){
                let c1=0
                for(c1; c1 < this.data.columnNumber;c1++){
                    listData[c1][this.data.scrollPageNumber+1].list = this.data._bakListData[this.data.scrollPageNumber+1][c1].list;
                }
            }

            // console.log('listData----', listData)

            // 将最近的3页数据显示出来
            this.setData({
                listData,
            });
        },

        // 获取滚动高度，来计算当前页码
        getPageScrollTop(){
            let self = this;

            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}`).boundingClientRect(function (res) {
                // console.log('self.data._diffHeight', self.data._diffHeight, self.data._showHeight, res.top)
                // 根据页面显示区域的底部位置计算当前是多少页
                let scrollP = 0;

                // 判断左右两边，哪边矮，则以哪边的高度计算翻页的页码
                let offsetLeftTop = Math.abs(res.top-self.data._showHeight+self.data._diffHeight);
                let offsetRightTop = Math.abs(res.top-self.data._showHeight+self.data._diffHeight);
                self.data._bakListData.forEach((item, i)=>{
                    if(offsetLeftTop >= 0 && offsetRightTop >= 0){
                        scrollP = i;
                        if(item.left && item.left.height){
                            offsetLeftTop -= item.left.height;
                        }
                        if(item.right && item.right.height){
                            offsetRightTop -= item.right.height;
                        }
                    }
                });

                let offsetColumnTop = [];
                let c=0
                for(c; c < self.data.columnNumber;c++){
                    offsetColumnTop[c] = Math.abs(res.top-self.data._showHeight+self.data._diffHeight);
                }
                self.data._bakListData.forEach((item, i)=>{
                    let hasGreaterThanOrEqualToZero = true;
                    let c2=0
                    for(c2; c2 < self.data.columnNumber;c2++){
                        if(offsetColumnTop[c2] < 0){
                            hasGreaterThanOrEqualToZero = false;
                        }
                    }

                    if(hasGreaterThanOrEqualToZero){
                        scrollP = i;

                        let c3=0
                        for(c3; c3 < self.data.columnNumber;c3++){
                            offsetColumnTop[c3] -= item[c3].height;
                        }
                    }
                });
                // console.log('scrollP---', scrollP)

                // 判断上一次的备份页码和现在计算出来的页码是否相同，如果相同就不做处理（目的优化性能）
                // console.log(self.data._bakScrollPageNumber, scrollP)
                if(self.data._bakScrollPageNumber === scrollP){
                    return;
                }
                // wx.getStorageSync('debug') && console.log('scrollP---', scrollP)

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

        // 无限滚动列表内部，所有滚动元素前面的元素高度有变化后需要调用下修正差值，也就是在 #recycleWaterList-content 内部，第一个 recycleList-item 前面的元素
        getScrollBeforeHeight(){
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
            //     // this.getScrollBeforeHeight();
            // });
        },
    }
  });
  
  