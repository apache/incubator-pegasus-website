---
permalink: api/geo
---

# Pegasus GEO支持

## 背景

业务数据跟Pegasus的普通数据类似，由hashkey、sortkey、value组成。但业务数据隐含有地理信息，比如value中包含有经纬度(latitude,longitude)，需要提供API进行GEO特性的支持，比如给定一个中心点坐标和一个半径，查找这个范围内的所有数据；给定两条数据的hashkey和sortkey，求这两条数据地理上的距离。

pegasus的GEO(Geographic)支持使用了[S2](https://github.com/google/s2geometry)库, 主要利用其中将二维地理坐标（经纬度）与一维编码的相互转换、基于圆形的范围查询、Hilbert曲线规则等特性。在Pegasus中如何充分利用S2的这些特性，并结合Pegasus的数据分布、数据存储特性，是本文的阐述重点。

关于S2的实现原理细节请参考[S2官网](http://s2geometry.io/)

## 坐标转换

在S2中，可以把二维经纬度编码成一维编码，一维编码由两部分组成：立方体面、平面坐标编码，比如：

经纬度(116.334441,40.030202)的编码是：`1/223320022232200331010110113301`（32位），在S2中称为cellid。

其中，首位的`1`代表地球立方体投影的面索引，索引范围是0~5，如下图所示：

![geo_faces.png](/assets/images/geo_faces.png){:class="img-responsive"}

`/`是分隔符

`223320022232200331010110113301`(30位)是经纬度坐标经过一系列转换得到的编码，具体转换过程这里不详细描述。需要指出的是，这是一个名为Hilbert曲线编码，它最大的特点是具有稳定性、连续性。

![hilbert.png](/assets/images/hilbert.png){:class="img-responsive"}

编码由前往后按层进行，完整编码是前缀编码的子区域，每个父区域由4个子区域组成，比如`00`,`01`,`02`,`03`是`0`的子区域，且前者的区域范围的并集就是后者的区域范围。最多有30层，每层都有相应的cellid集合，高层cell是底层cell的父区域，高层cellid是底层cellid的前缀。

编码可以看作是一个4进制的数值编码，同时**在数值上连续的值，在地理位置上也是连续的**。

## 编码精度

S2中的Hilbert曲线编码由30位组成，每一位代表一层划分。下表是各层单个cell的面积和cell个数。

| **level** | **min area** | **max area** | **average area** | **units** | **Number of cells** |
|-----------|--------------|--------------|------------------|-----------|---------------------|
| 00        | 85011012.19  | 85011012.19  | 85011012.19      | km^2      | 6                   |
| 01        | 21252753.05  | 21252753.05  | 21252753.05      | km^2      | 24                  |
| 02        | 4919708.23   | 6026521.16   | 5313188.26       | km^2      | 96                  |
| 03        | 1055377.48   | 1646455.50   | 1328297.07       | km^2      | 384                 |
| 04        | 231564.06    | 413918.15    | 332074.27        | km^2      | 1536                |
| 05        | 53798.67     | 104297.91    | 83018.57         | km^2      | 6K                  |
| 06        | 12948.81     | 26113.30     | 20754.64         | km^2      | 24K                 |
| 07        | 3175.44      | 6529.09      | 5188.66          | km^2      | 98K                 |
| 08        | 786.20       | 1632.45      | 1297.17          | km^2      | 393K                |
| 09        | 195.59       | 408.12       | 324.29           | km^2      | 1573K               |
| 10        | 48.78        | 102.03       | 81.07            | km^2      | 6M                  |
| 11        | 12.18        | 25.51        | 20.27            | km^2      | 25M                 |
| 12        | 3.04         | 6.38         | 5.07             | km^2      | 100M                |
| 13        | 0.76         | 1.59         | 1.27             | km^2      | 402M                |
| 14        | 0.19         | 0.40         | 0.32             | km^2      | 1610M               |
| 15        | 47520.30     | 99638.93     | 79172.67         | m^2       | 6B                  |
| 16        | 11880.08     | 24909.73     | 19793.17         | m^2       | 25B                 |
| 17        | 2970.02      | 6227.43      | 4948.29          | m^2       | 103B                |
| 18        | 742.50       | 1556.86      | 1237.07          | m^2       | 412B                |
| 19        | 185.63       | 389.21       | 309.27           | m^2       | 1649B               |
| 20        | 46.41        | 97.30        | 77.32            | m^2       | 7T                  |
| 21        | 11.60        | 24.33        | 19.33            | m^2       | 26T                 |
| 22        | 2.90         | 6.08         | 4.83             | m^2       | 105T                |
| 23        | 0.73         | 1.52         | 1.21             | m^2       | 422T                |
| 24        | 0.18         | 0.38         | 0.30             | m^2       | 1689T               |
| 25        | 453.19       | 950.23       | 755.05           | cm^2      | 7e15                |
| 26        | 113.30       | 237.56       | 188.76           | cm^2      | 27e15               |
| 27        | 28.32        | 59.39        | 47.19            | cm^2      | 108e15              |
| 28        | 7.08         | 14.85        | 11.80            | cm^2      | 432e15              |
| 29        | 1.77         | 3.71         | 2.95             | cm^2      | 1729e15             |
| 30        | 0.44         | 0.93         | 0.74             | cm^2      | 7e18                |



## 数据存储

在Pegasus中，数据存储的key是hashkey+sortkey: hashkey用于数据partition，同一hashkey的数据存储在同一replica server下的一块或多块（由rocksdb实际存储的状态决定：数据随机写入后，同一hashkey下连续的sortkey空间可能分布在多个不连续的sst文件中，进行full compact后，会分布在连续sst的内）连续区域; sortkey用于在这块（或多块）区域中做数据排序的依据。

经纬度经过坐标转换得到一维编码(字符串)后，就可以把这个一维编码作为key存储起来做**GEO索引数据**了，这里需要将这个一维编码拆分成hashkey和sortkey两部分，可以根据实际的业务场景采取不同的划分策略。

GEO索引数据独立于原始数据，两类数据存储在不同的table内，通过[geo_client](https://github.com/apache/incubator-pegasus/blob/master/src/geo/lib/geo_client.h)做数据同步，同时支持原生Pegasus API和GEO API访问。

下面讨论GEO索引数据的构造方式。

### hashkey

hashkey直接由一维编码的前缀构成。比如在我们的LBS业务场景中，范围查询都是集中在10km半径内的圆形范围，实际测试结果是将hashkey长度定为`14`（1位face，1位分隔符`/`，12位Hilbert编码）能取得更好的性能。

> `最小搜索层`为12

```
               cellid
|--------------32 bytes-------------|
|---14 bytes----|
    hashkey
```

### sortkey

为了满足不同半径范围、不同精度的查询，我们把cellid剩下的18位全部放到sortkey中（这并不会给底层存储带来多少压力），这可以在应用层保持比较高的灵活性，而不用修改底层的数据。在进行较大范围的临近查询时，取更少的sortkey位数（对应的cellid更短）进行数据查询；进行较小范围的临近查询或点查询时，取更多的sortkey位数（对应的cellid更长）进行数据查询。

尽管在30层时，cell的面积已经足够小（<1cm^2），但仍有可能两条数据落在同一个cell里，所以需要区分不同的数据。这里，将原始数据的hashkey和sortkey联合起来，并追加在上述sortkey之后。

                   cellid
    |--------------32 bytes-------------|
    |---14 bytes---||-----18 bytes------||--原始hashkey--||--原始sortkey--|
    |--GEO hashkey-||----------------------GEO sortkey-------------------|


> 在相同地理范围内进行数据查询时，使用短cellid查询数据查询的范围大，查询的次数更少，但得到的在区域外的无用数据更多，反之亦然---这需要在查询次数与查询到的有用数据之间做权衡。

### value

GEO API的value必须能够解析出经纬度，具体的解析方式参考[自定义extrator](https://pegasus.apache.org/api/geo#%E8%87%AA%E5%AE%9A%E4%B9%89extrator)。

GEO索引数据的value跟原始数据的value完全相同。这里会存在一份冗余，但通常在相对廉价的磁盘存储介质上，这是可以接受的。

> 我们建议业务层在使用GEO API时value只存储小数据，大数据建议采用二次索引的方式。

## 数据更新

### set

`set`操作会同时更新两个table的数据: Pegasus原始数据和GEO索引数据（数据构造方式如上所述）。

> `set`操作的hashkey, sortkey是业务自己的格式，使用GEO API时并不做约束， 只是在geo client转存GEO索引数据时，会自动做如上所述的编码转换。

> 使用Redis API时， 参考 [GEO API](https://pegasus.apache.org/api/redis#geo-api)。

> 实现上，`set`会首先尝试`get`出已有的数据，并将已有数据的GEO索引数据清理掉后，再写入新数据。因为新老数据的索引数据hashkey+sortkey可能不一样（即新老value根据extractor解析得到的经纬度不一样），若不清理，在进行地理搜索时将会搜索到脏数据。

### del

`del`操作也会同时删除两个table的数据，原理同上。

## 数据查询

### 思路

直观地，集合中总的cell数量尽可能少，但同时单个cell面积尽可能小。比如：

![s2_cap_1.png](/assets/images/s2_cap_1.png){:class="img-responsive"}

虽然这样的结果更精确，但在实际测试中发现当参与计算的cell层级越大时，cellid的数量就越多，带来的client-server RPC次数更多，整个API消耗更大、延迟就越高。同时，在真实的应用场景中，太小的cell意义不大（没有数据）。

所以，在当前的Pegasus实现中，只联合使用两层cell,`最大搜索层`和`最小搜索层`， 以12层和16层为例：

![s2_cap_2.png](/assets/images/s2_cap_2.png){:class="img-responsive"}

### 查询流程

以search_radial为例，此API的意义是给定点和半径，求出该圆形区域内的所有数据。

> 这里我们只讨论圆形区域的数据查询，其他的比如多边形区域的思想是类似的。

需利用S2提供的查询覆盖指定区域的cellid集合的API：

```
// Returns an S2CellUnion that covers the given region and satisfies the current options.
S2CellUnion GetCovering(const S2Region& region);
```

> `search_radial`API有两个重载函数，一个是输入经纬度，一个是输入hashky+sortkey，后者是通过key取到经纬度再转调前者。

查询流程如下:

1. 根据经纬度、半径，求出S2Cap圆形区域`C`
2. 根据圆形区域、指定的`最小搜索层`，通过`GetCovering`，求出在`最小搜索层`上的cellid集合
3. 遍历这些cellid，判断cellid区域跟圆形区域`C`的关系
   1. 全覆盖：取该cellid的所有数据
   2. 半覆盖：将该cellid按`最大搜索层`继续拆份， 判断拆分后的sub_cellid区域与圆形区域`C`的关系
      1. 相交：取该sub_cellid的所有数据
      2. 不相交：排除

> `最小搜索层`，`最大搜索层`的配置参考后文。

取一个cellid的所有数据时，会根据上文的key构造规则，构造一对包含这个cellid所有数据的`start_sortkey`，`stop_sortkey`，再使用Pegasus的`scan`接口进行数据搜索。

- 对于`3.1`步取到的cellid，它的长度即是hashkey的长度，它也就是hashkey，调用`scan(cellid, '"', "")`搜索数据
  - 比如，一个12层cell `1/223320022232`被区域完全覆盖，则我们`scan("1/223320022232", "", "")`。
- 对于`3.2.1`步取到的sub_cellid，hashkey是它的前缀，调用`scan(sub_cellid[0:hashkey_len], sub_cellid[hashkey_len:], sub_cellid[hashkey_len:])`搜索数据
  - 比如，一个12层cell `1/223320022232`的子区域`0001`,`0002`,`0003`,`0100`才跟目标区域相交时，则我们`scan("1/223320022232", "0001", "0003")`、`scan("1/223320022232", "0100", "0100")`。

> 此处还有一个根据Hilbert曲线实现的一个优化，具体参见[代码](https://github.com/apache/incubator-pegasus/blob/master/src/geo/lib/geo_client.cpp)

得到`scan`的结果后，还需处理：

- 计算距离：因为cellid可能只与输入区域部分重合，该点若在区域外， 需去除
- 排序：当有升序/降序要求时

### 灵活性

由于我们存储了完整的30层cellid，所以在实际使用中，可以按照自己的地理数据密度、延迟要求等情况调整API的的`最大搜索层`。

> 默认为`16`。

#### API方式

```
dsn::error_s set_max_level(int level);
```

#### 配置文件方式

```
[geo_client.lib]
max_level = 16
```

### 不变性

修改hashkey长度需要修改配置文件，但需注意：hashkey一旦确定，数据写入后改配置便不可修改，因为数据已按这个hashkey长度规则固化下来。

> 默认为`12`。

```
[geo_client.lib]
;NOTE: 'min_level' is immutable after some data has been inserted into DB by geo_client.
min_level = 12
```

## 自定义extrator

目前Pegasus支持从固定格式的value中解析经纬度。经纬度以字符串形式嵌入在value中，以`|`分割， 比如:`.*|115.886447|41.269031|.*`，他们的索引由配置文件中的`latitude_index`和`longitude_index`确定。

## API & redis proxy

Pegasus GEO特性的使用有两种方式，一是直接使用C++ geo client；二是使用redis proxy。

[C++ geo client代码](https://github.com/apache/incubator-pegasus/blob/master/src/geo/lib/geo_client.h)中有详细的API说明，这里不再赘述。

## 配置文件

redis proxy的使用请参考[Redis适配](/_docs/zh/api/redis.md)。

GEO API添加的配置文件如下:

```
[geo_client.lib]
;NOTE: 'min_level' is immutable after some data has been inserted into DB by geo_client.
min_level = 12
max_level = 16

; 用于经纬度的extrator
latitude_index = 5
longitude_index = 4
```

## 数据导入

有的使用场景是业务已经有普通的KV数据，需要根据这份已有的KV数据转换成如上述的数据格式，我们可以使用shell工具里的`copy_data`功能来实现。比如：

```
copy_data -c target_cluster -a temp -g
```

此时目标集群是`target_cluster`，目标表是`temp`，他存储上述的普通数据，目标GEO索引数据表是`temp_geo`，他存储上述的GEO索引数据。

在进行`copy_data`操作之前，目标集群以及两个目标表都需要提前创建好。

数据导入完成后就可以搭建`redis_proxy`了，具体的说明参考[redis适配](/_docs/zh/api/redis.md)，需要注意的是配置项：

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

- 节点数：5个replica server节点（使用v1.9.2版本）
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

| 半径(m) | P50(ms)     | P75(ms)     | P99(ms)     | P99.9(ms)   | 平均结果条数     | 单节点QPS  |
|-------|-------------|-------------|-------------|-------------|------------|---------|
| 50    | 1.63071622  | 1.84607433  | 4.04545455  | 6.28        | 9.4608     | 740.287 |
| 100   | 1.76        | 2.33614794  | 5.4         | 6.45319149  | 38.0296    | 656.66  |
| 200   | 2.41017042  | 3.31062092  | 6.41781609  | 9.60588235  | 154.3682   | 536.624 |
| 300   | 3.30833333  | 4.21979167  | 9.4310559   | 18          | 350.9676   | 434.491 |
| 500   | 5.07763975  | 6.84964682  | 16.84931507 | 21.78082192 | 986.0826   | 347.231 |
| 1000  | 12.28164727 | 18.70972532 | 43.18181818 | 57.049698   | 3947.5294  | 204.23  |
| 2000  | 35.78666667 | 54.7300885  | 108.7331378 | 148.616578  | 15674.1198 | 98.7633 |
