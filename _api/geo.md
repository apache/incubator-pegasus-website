---
title: GEO支持
layout: page
menubar: api_menu
---

# Pegasus GEO支持

## 背景

业务数据跟Pegasus的普通数据类似，由hashkey、sortkey、value组成。但业务数据隐含有地理信息，比如value中包含有经纬度(latitude,longitude)，需要提供API进行GEO特性的支持，比如给定一个中心点坐标和一个半径，查找这个范围内的所有数据；给定两条数据的hashkey和sortkey，求这两条数据地理上的距离。

pegasus的GEO(Geographic)支持使用了[S2](https://github.com/google/s2geometry)库, 主要利用其中将二维地理坐标（经纬度）与一维编码的相互转换、基于圆形的范围查询、Hilbert曲线规则等特性。在Pegasus中如何充分利用S2的这些特性，并结合Pegasus的数据分布、数据存储特性，是本文的阐述重点。

关于S2的实现原理细节请参考S2官网: http://s2geometry.io/

## 坐标转换

在S2中，可以把二维经纬度编码成一维编码，一维编码由两部分组成：立方体面、平面坐标编码，比如：

经纬度(116.334441,40.030202)的编码是：1/223320022232200331010110113301（32位），在S2中称为cellid。

其中，"1"代表地球立方体投影的面索引，索引范围是0~5，如下图所示：

![img](http://s2geometry.io/devguide/img/s2cell_global.jpg)

"/"是分隔符

"223320022232200331010110113301"(30位)是经纬度坐标经过一系列转换得到的编码，具体转换过程这里不详细描述。需要指出的是，这是一个Hilbert曲线编码，它最大的特点是具有稳定性、连续性。

![Figures from Hilbert's 1891 paper](http://s2geometry.io/devguide/img/hilbert-figure.gif)

编码由前往后按层进行，完整编码是前缀编码的子区域，每个父区域由4个子区域组成，比如`00`,`01`,`02`,`03`是`0`的子区域，且前者的区域范围的并集就是后者的区域范围。最多有30层，每层都有相应的cellid集合，高层cell是底层cell的父区域，高层cellid是底层cellid的前缀。

编码可以看作是一个4进制的数值编码，同时在数值上连续的值，在地理位置上也是连续的。

## 编码精度

S2中的Hilbert曲线编码由30位组成，每一位代表一层划分。下表是各层单个cell的面积和cell个数。

| **level** | **min area** | **max area** | **average area** | **units** | **Number of cells** |
| --------- | ------------ | ------------ | ---------------- | --------- | ------------------- |
| 00        | 85011012.19  | 85011012.19  | 85011012.19      | km^2    | 6                   |
| 01        | 21252753.05  | 21252753.05  | 21252753.05      | km^2    | 24                  |
| 02        | 4919708.23   | 6026521.16   | 5313188.26       | km^2    | 96                  |
| 03        | 1055377.48   | 1646455.50   | 1328297.07       | km^2    | 384                 |
| 04        | 231564.06    | 413918.15    | 332074.27        | km^2    | 1536                |
| 05        | 53798.67     | 104297.91    | 83018.57         | km^2    | 6K                  |
| 06        | 12948.81     | 26113.30     | 20754.64         | km^2    | 24K                 |
| 07        | 3175.44      | 6529.09      | 5188.66          | km^2    | 98K                 |
| 08        | 786.20       | 1632.45      | 1297.17          | km^2    | 393K                |
| 09        | 195.59       | 408.12       | 324.29           | km^2    | 1573K               |
| 10        | 48.78        | 102.03       | 81.07            | km^2    | 6M                  |
| 11        | 12.18        | 25.51        | 20.27            | km^2    | 25M                 |
| 12        | 3.04         | 6.38         | 5.07             | km^2    | 100M                |
| 13        | 0.76         | 1.59         | 1.27             | km^2    | 402M                |
| 14        | 0.19         | 0.40         | 0.32             | km^2    | 1610M               |
| 15        | 47520.30     | 99638.93     | 79172.67         | m^2     | 6B                  |
| 16        | 11880.08     | 24909.73     | 19793.17         | m^2     | 25B                 |
| 17        | 2970.02      | 6227.43      | 4948.29          | m^2     | 103B                |
| 18        | 742.50       | 1556.86      | 1237.07          | m^2     | 412B                |
| 19        | 185.63       | 389.21       | 309.27           | m^2     | 1649B               |
| 20        | 46.41        | 97.30        | 77.32            | m^2     | 7T                  |
| 21        | 11.60        | 24.33        | 19.33            | m^2     | 26T                 |
| 22        | 2.90         | 6.08         | 4.83             | m^2     | 105T                |
| 23        | 0.73         | 1.52         | 1.21             | m^2     | 422T                |
| 24        | 0.18         | 0.38         | 0.30             | m^2     | 1689T               |
| 25        | 453.19       | 950.23       | 755.05           | cm^2    | 7e15                |
| 26        | 113.30       | 237.56       | 188.76           | cm^2    | 27e15               |
| 27        | 28.32        | 59.39        | 47.19            | cm^2    | 108e15              |
| 28        | 7.08         | 14.85        | 11.80            | cm^2    | 432e15              |
| 29        | 1.77         | 3.71         | 2.95             | cm^2    | 1729e15             |
| 30        | 0.44         | 0.93         | 0.74             | cm^2    | 7e18                |

## 数据存储

在Pegasus中，数据存储的key是hashkey+sortkey: hashkey用于数据partition，同一hashkey的数据存储在同一replica server下的一块或多块（由rocksdb实际存储的状态决定：数据随机写入后，hashkey下连续的sortkey空间可能分布在多个不连续的sst中，进行full compact后，会分布在连续sst的内）连续区域; sortkey用于在这块（或多块）区域中做数据排序的依据。

经纬度经过坐标转换得到一维编码后，就可以把这个一维编码作为key存储起来做GEO索引了，这里需要将这个一维编码划分为hashkey和sortkey，可以根据实际的业务场景采取不同的划分策略。GEO索引数据独立于原始数据，两类数据存储在不同的table内，同时满足原生Pegasus API和新的GEO API。

下面讨论GEO索引数据的构造方式。

### hashkey

hashkey直接由一维编码的前缀构成。比如在我们的LBS业务场景中，范围查询都是集中在10km半径内的圆形范围，实际测试结果是将hashkey长度定为14（1位face，1位分隔符"/",12位Hilbert编码）会取得更好的性能。

```
               cellid
|--------------32 bytes-------------|
|---14 bytes----|
    hashkey
```

### sortkey

为了满足不同半径范围、不同精度的查询，我们把cellid剩下的18位全部放到sortkey中（这并不会给底层存储带来多少压力），这可以在应用层保持比较高的灵活性，而不用修改底层的数据。在进行较大范围的临近查询时，取更少的sortkey位数（对应的cellid更短）进行数据查询；进行较小范围的临近查询或点查询时，取更多的sortkey位数（对应的cellid更长）进行数据查询。

尽管在30层时，cell的面积已经足够小（<1$cm^2$），但仍有可能两条数据落在同一个cell里，所以需要区分不同的数据。这里，将原始数据的hashkey和sortkey联合起来，并追加在上述sortkey之后。

                   cellid
    |--------------32 bytes-------------|
    |---14 bytes---||-----18 bytes------||--原始hashkey--||--原始sortkey--|
    |--GEO hashkey-||----------------------GEO sortkey-------------------|
在相同地理范围内进行数据查询时，使用短cellid查询数据查询的范围大，查询的次数更少，但得到的在区域外的无用数据更多，反之亦然---这需要在查询次数与查询到的有用数据之间做权衡。

### value

GEO索引数据的value跟原始数据的value相同。这里会存在一份冗余，但通常在相对廉价的磁盘存储介质上，这是可以接受的。

## 数据查询

这里我们只讨论圆形区域的数据查询，其他的比如多边形区域的思想是类似的。

S2提供查询覆盖了指定区域的cell集合的API：

```
// Returns an S2CellUnion that covers the given region and satisfies the current options.
S2CellUnion GetCovering(const S2Region& region);
```

默认情况下，集合中总的cell数量尽可能少，但同时单个cell面积尽可能小。比如：

![s2_cap_1.png](/assets/images/s2_cap_1.png){:class="img-responsive"}

虽然这样的结果更精确，但在实际测试中发现当cell越小时，API返回越慢。同时，在真实的应用场景中，太小的cell意义不大，反而会增加cell的个数，这会带来RPC次数的增加。

所以，在当前的Pegasus实现中，只联合使用两层cell,12层和16层。

![s2_cap_2.png](/assets/images/s2_cap_2.png){:class="img-responsive"}

对于这些跟目标区域有交集的cell，我们将scan他的key空间。

对于整个hashkey所代表的cell都被目标区域覆盖时，扫描整个hashkey。比如，一个12层cell `1/223320022232`被区域完全覆盖，则我们scan("1/223320022232", "", "")。

对于hashkey所代表的cell被目标区域部分覆盖时，按需扫描。比如，一个12层cell `1/223320022232`的子区域`0001`,`0002`,`0003`,`0100`才跟目标区域相交时，则我们scan("1/223320022232", "0001", "0002")、scan("1/223320022232", "0100", "0100")。

### 灵活性

由于我们存储了完整的30层cellid，所以在实际使用中，可以按照自己的地理数据密度、延迟要求等情况调整数据scan的层级。

修改hashkey长度需要修改代码。注意：hashkey一旦确定，不可修改，因为数据的partition是按hashkey进行的。

```
// cell id at this level is the hash-key in pegasus
// `_min_level` is immutable after geo_client data has been inserted into DB.
const int _min_level = 12; // edge length at level 12 is about 2km
```

修改scan的最小cell层级可以直接修改配置文件或调用接口。

```
// API
void set_max_level(int level)

// config.ini
[geo_client.lib]
max_level = 16
```

## API & redis proxy

Pegasus GEO特性的使用有两种方式，一是直接使用C++ geo client；二是使用redis proxy。

[C++ geo client代码](https://github.com/XiaoMi/pegasus/blob/master/src/geo/lib/geo_client.h)中有详细的API说明，这里不再赘述。

redis proxy的使用请参考[Redis适配](redis)。

## 自定义extrator

目前Pegasus支持从固定格式的value中解析经纬度。用户也可以根据自己的数据格式自定义解析方式。只需继承`latlng_extractor`类并实现其虚函数：

```
class latlng_extractor
{
public:
    virtual ~latlng_extractor() = default;
    virtual const char *name() const = 0;
    virtual const char *value_sample() const = 0;
    virtual bool extract_from_value(const std::string &value, S2LatLng &latlng) const = 0;
};
```

并在创建`geo_client`时，传递自定义的extractor实例指针，比如：

```
pegasus::geo::geo_client my_geo("config.ini",
                                cluster_name.c_str(),
                                app_name.c_str(),
                                geo_app_name.c_str(),
                                new pegasus::geo::latlng_extractor_for_lbs());
```
## 数据导入

有的使用场景是业务已经有普通的KV数据，需要根据这份已有的KV数据转换成如上述的数据格式，我们可以使用shell工具里的`copy_data`功能来实现。比如：

```
copy_data -c target_cluster -a temp -g
```

此时目标集群是`target_cluster`，目标表是`temp`，他存储上述的普通数据，目标GEO索引数据表是`temp_geo`，他存储上述的GEO索引数据。

在进行`copy_data`操作之前，目标集群以及两个目标表都需要提前创建好。

数据导入完成后就可以搭建`redis_proxy`了，具体的说明参考[redis适配](redis)，需要注意的是配置项：

```
[apps.proxy]
; if using GEO APIs, an extra table name which store geo index data should be appened, i.e.
arguments = redis_cluster temp temp_geo
```

## benchmark

### 测试环境

机器配置：

- CPU：E5-2620v3 *2
- 内存：128GB
- 存储：480G SSD *8
- 网卡：1Gb

集群配置：

- 节点数：5个replica server节点（使用[v1.9.2版本](https://github.com/XiaoMi/pegasus/releases/tag/v1.9.2)）
- 测试表的Partition数：128个
- 单条数据大小：120字节

针对接口：

```
void async_search_radial(double lat_degrees,
                         double lng_degrees,
                         double radius_m,
                         int count,
                         SortType sort_type,
                         int timeout_ms,
                         geo_search_callback_t &&callback);
```

传递参数：

lat_degrees、lng_degrees：每次都选取北京五环内的随机点

radius_m：如下表第一列，单位米

count：-1，表示不限定结果数量

sort_type：不排序

### 测试结果

| 半径(m) | P50(ms)     | P75(ms)     | P99(ms)     | P99.9(ms)   | 平均结果条数 | 单节点QPS |
| ------- | ----------- | ----------- | ----------- | ----------- | ------------ | --------- |
| 50      | 1.63071622  | 1.84607433  | 4.04545455  | 6.28        | 9.4608       | 740.287   |
| 100     | 1.76        | 2.33614794  | 5.4         | 6.45319149  | 38.0296      | 656.66    |
| 200     | 2.41017042  | 3.31062092  | 6.41781609  | 9.60588235  | 154.3682     | 536.624   |
| 300     | 3.30833333  | 4.21979167  | 9.4310559   | 18          | 350.9676     | 434.491   |
| 500     | 5.07763975  | 6.84964682  | 16.84931507 | 21.78082192 | 986.0826     | 347.231   |
| 1000    | 12.28164727 | 18.70972532 | 43.18181818 | 57.049698   | 3947.5294    | 204.23    |
| 2000    | 35.78666667 | 54.7300885  | 108.7331378 | 148.616578  | 15674.1198   | 98.7633   |
