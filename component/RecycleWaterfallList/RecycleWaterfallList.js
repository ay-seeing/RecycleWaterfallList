/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-07-27 11:58:43
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
        },
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
        _bakListData: [],  // 数据备份,[{left: {height: xxx, list: []}, right: {height: xxx, list: []}}]
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
        // 获取圈子数据方法
        async getFeeds() {
            console.log('component----', '加载数据-start', this.data.hasMore, this.data.hasLoading, this.data._hasWaterfallRenderEnd)
            // wx.getStorageSync('debug') && console.log('component----', '加载数据-start', this.data.hasMore, this.data.hasLoading, this.data._hasWaterfallRenderEnd)
            // 如果没有更多，则直接返回
            // 判断如果正在加载，则进行节流处理，不请求下一次的接口请求
            if (!this.data.hasMore || this.data.hasLoading) {
                return;
            }

            // 如果还在渲染，则300ms后再执行
            if(!this.data._hasWaterfallRenderEnd){
                setTimeout(()=>{
                    this.getFeeds();
                }, 300);
                return;
            }

            console.log('component----', '加载数据-ing',)
            // wx.getStorageSync('debug') && console.log('component----', '加载数据-ing',)
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
                let list = content.list;

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

                // 将数据存储起来，瀑布流渲染完成后才能存储起来
                this.data._bakListData[this.data._currentPageNumber] = {
                    list,
                }

                // 根据页码获取需要显示的数据
                this.getShowData();
            } else {
                this.setData({
                    hasMore: false,
                });
            }
        },
        // 瀑布流渲染
        async waterfallRender(list){
            console.log('list-', list)
            // 如果没有数据则不进行瀑布流渲染
            if (list.length <= 0) {
                return;
            }
            this.data._hasWaterfallRenderEnd = false;
            for(var i=0;i<list.length;i++){
            // list.forEach((item, i)=>{
                // console.log('-', i)
                let item = list[i];
                let inset = await this.diffLeftAndRightHeight();
                // console.log('----', i, inset)
                if(inset.leftHeight <= inset.rightHeight){
                    let leftFallD = this.data.leftFallData;
                    // console.log('leftFallD--', leftFallD)
                    if(!leftFallD[this.data._currentPageNumber]){
                        leftFallD[this.data._currentPageNumber] = {
                            list:[],
                        } 
                    }
                    leftFallD[this.data._currentPageNumber].list.push(item);
                    
                    if(!this.data._bakListData[this.data._currentPageNumber].left){
                        this.data._bakListData[this.data._currentPageNumber].left = {};
                    }
                    if(!this.data._bakListData[this.data._currentPageNumber].left.list){
                        this.data._bakListData[this.data._currentPageNumber].left.list = [];
                    }
                    this.data._bakListData[this.data._currentPageNumber].left.list.push(item);
                    // console.log('leftFallData----', leftFallD)
                    this.setData({
                        leftFallData: leftFallD,
                    },async ()=>{
                        if(i === this.data._apiData.limit){
                            // 判断，如果this.data._bakListData 每个元素里面有left和right数据，那么就删除list数据，减少数据量
                            this.data._bakListData.forEach((item)=>{
                                if(item.left){
                                    delete item.list;
                                }
                            });
                            await setTimeout(async ()=>{
                                console.log('leftFallData-1---,准备计算高度',i, leftFallD, this.data._currentPageNumber)
                                // console.log('rightFallData-1---', rightFallD)
                                // 插入结束，获取当前页的高度
                                await this.getPrevPageHeight(this.data._currentPageNumber, 'left');
                                await this.getPrevPageHeight(this.data._currentPageNumber, 'right');

                                // 标注瀑布流渲染结束
                                console.log('l-瀑布流渲染结束--', this.data._currentPageNumber, '--------------------')
                                this.data._hasWaterfallRenderEnd = true;
                            }, 0);
                        }
                    });
                }else{
                    let rightFallD = this.data.rightFallData;
                    if(!rightFallD[this.data._currentPageNumber]){
                        rightFallD[this.data._currentPageNumber] = {
                            list:[],
                        }
                    }
                    rightFallD[this.data._currentPageNumber].list.push(item);

                    if(!this.data._bakListData[this.data._currentPageNumber].right){
                        this.data._bakListData[this.data._currentPageNumber].right = {};
                    }
                    if(!this.data._bakListData[this.data._currentPageNumber].right.list){
                        this.data._bakListData[this.data._currentPageNumber].right.list = [];
                    }
                    this.data._bakListData[this.data._currentPageNumber].right.list.push(item);

                    this.setData({
                        rightFallData: rightFallD,
                    }, async ()=>{
                        if(i === this.data._apiData.limit){
                            // 判断，如果this.data._bakListData 每个元素里面有left和right数据，那么就删除list数据，减少数据量
                            this.data._bakListData.forEach((item)=>{
                                if(item.left){
                                    delete item.list;
                                }
                            });
                            await setTimeout(async ()=>{
                                // console.log('leftFallData-1---', leftFallD)
                                console.log('rightFallData-1---,准备计算高度', i, rightFallD, this.data._currentPageNumber)
                                // 插入结束，获取当前页的高度
                                await this.getPrevPageHeight(this.data._currentPageNumber, 'left');
                                await this.getPrevPageHeight(this.data._currentPageNumber, 'right');

                                // 标注瀑布流渲染结束
                                console.log('r-瀑布流渲染结束--', this.data._currentPageNumber, '--------------------');
                                this.data._hasWaterfallRenderEnd = true;
                            }, 0)
                        }
                    });
                }
            // });
            }

            
        },
        // 左右高度对比
        diffLeftAndRightHeight(){
            let leftHeight = 0;
            let rightHeight = 0;
            // 获取左边高度
            return new Promise((resolve, reject)=>{
                let query = this.createSelectorQuery();
                query.select(`#${this.data.recycleListContentId}-fallLeft`).boundingClientRect() -100;
                query.select(`#${this.data.recycleListContentId}-fallRight`).boundingClientRect() -100;
                query.exec((res) => {
                    if(res && res.length && res[0]) {
                        leftHeight = res[0].height;
                        rightHeight = res[1].height;
                    }
                    // console.log('左右高度', leftHeight, rightHeight)
                    resolve({leftHeight, rightHeight});
                });
            });
        },
        // 根据滚动页码获取需要显示数据
        getShowData(){
            // 如果还在进行瀑布流渲染，则不让重新计算，否则会有问题
            if (!this.data._hasWaterfallRenderEnd) {
                return;
            }

            let listData = []
            let unSx = [];
            // 设置数据有多少页
            // listData.length = this.data._bakListData.length;
            // 将备份数据里面的存储dom高度的对象给 listData，用于后面渲染设置高度
            this.data._bakListData.forEach((item, i)=>{
                let {left, right} = item;
                if(left){
                    listData[i] = {
                        left: {
                            height: left.height,
                        },
                        right: {
                            height:right.height,
                        }
                    }
                }
            });

            console.log('this.data._bakListData----2', JSON.parse(JSON.stringify(listData)) ,JSON.parse(JSON.stringify(this.data._bakListData)));

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

            let leftData = [];
            let rightData = [];

            // 先将格式化后的数据筛选出来直接渲染
            listData.forEach((item, i)=>{
                if(item && item.list){
                    unSx = item.list
                }else{
                    leftData.push(item.left);
                    rightData.push(item.right);
                }
            });

            console.log('leftData----', leftData)

            // 将最近的3页数据显示出来
            this.setData({
                leftFallData: leftData,
                rightFallData: rightData,
            }, async ()=>{
                // 瀑布流渲染
                await this.waterfallRender(unSx);

                // 判断是否是不等高子元素，如果是不等高子元素，则需要获取page高度，那么每页的高度就不通过第一个item去计算得到了，这里就需要获取下上一页的高度
                // console.log('this.data._currentPageNumber---', this.data._currentPageNumber, this.data._bakScrollPageNumber)
                // await this.getPrevPageHeight(this.data._currentPageNumber, 'left');
                // await this.getPrevPageHeight(this.data._currentPageNumber, 'right');
                // console.log('this.data._bakListData-3--', this.data._bakListData)
                
            }, 100)
        },

        // 获取上一页的高度
        getPrevPageHeight(pageN, dis){
            let self = this;
            return new Promise((resolve, reject)=>{
                let query = self.createSelectorQuery();

                let itemPage = query.select((dis=== 'left' ? `#${self.data.recycleListContentId}-fallLeft` : `#${self.data.recycleListContentId}-fallRight`)+ ' .item-page-'+pageN);

                itemPage.boundingClientRect(function (res2) {
                    if(res2){
                        console.log('高度获取结果：', self.data._bakListData[pageN][dis], res2.height)
                        self.data._bakListData[pageN][dis] = {
                            list: self.data._bakListData[pageN][dis].list,
                            height: res2.height,
                        }
                    }
                    resolve();
                }).exec();
            })
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
                // console.log('------', offsetLeftTop, self.data._bakListData, self.data._bakListData.length, self.data._hasWaterfallRenderEnd)
                self.data._bakListData.forEach((item, i)=>{
                    if(offsetLeftTop >= 0 && offsetRightTop >= 0){
                        scrollP = i;
                        if(item.left && item.left.height){
                            offsetLeftTop -= item.left.height;
                        }
                        if(item.right && item.right.height){
                            offsetRightTop -= item.right.height;
                        }
                        // if(item.list){
                        //     offsetLeftTop -= item.left.height;
                        //     offsetRightTop -= item.right.height;
                        // }
                        
                    }
                });
                // console.log('scrollP---', scrollP)

                // 判断上一次的备份页码和现在计算出来的页码是否相同，如果相同就不做处理（目的优化性能）
                // console.log(self.data._bakScrollPageNumber, scrollP)
                if(self.data._bakScrollPageNumber === scrollP){
                    return;
                }
                console.log('scrollP---', scrollP)

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
  
  