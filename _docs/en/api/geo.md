---
permalink: api/geo
---

# Pegasus GEO

## Background

In Pegasus, if the user data is POI (Points of Interest) data, which contains geographic information, such as longitude and latitude in value, and users require Pegasus to provide interfaces to support GEO features. For example, given a center point coordinate and a radius, search for all data within this range. Given the hashkey and sortkey of two POI data, calculate the geographical distance between these two pieces of data.

Pegasus's GEO (Geographic) support uses [S2](https://github.com/google/s2geometry) library, mainly used for converting two-dimensional geographic coordinates (longitude+latitude) to one-dimensional encoding, range queries based on circles, Hilbert curve rules, and other characteristics.

This article will explain how to fully utilize the characteristics of S2 in Pegasus, and combine the data distribution and storage characteristics of Pegasus to support GEO features.

Please refer to the [S2 official website](http://s2geometry.io/) for the implementation principle of S2.

## Coordinate transformation

In S2, two-dimensional longitude and latitude can be encoded into one-dimensional encoding, which consists of two parts: face cells and plane coordinate encoding, such as:

The encoding of two-dimensional coordinate (116.334441, 40.030202) is: `1/223320022232200331010110113301`(32 bytes), it is called **CellId** in S2.

- The first `1` represents the face cell index of the Earth cube projection, with an index range of 0~5, as shown in the following figure:

![geo_faces.png](/assets/images/geo_faces.png){:class="img-responsive"}
- `/` is a delimiter
- `223320022232200331010110113301`(30 bytes), is the encoding obtained through a series of transformations of latitude and longitude coordinates, and the specific transformation process is not described in detail here. It should be pointed out that this is a Hilbert curve encoding, which is characterized by stability and continuity.

![hilbert.png](/assets/images/hilbert.png){:class="img-responsive"}

Hilbert curve encoding in S2:
- Encoding can be seen as a 4-digit numerical encoding
- Encoding is done layer by layer from left to right, with a maximum of 30 layers
- A code represents a geographic block area, and the longer the code, the smaller the area
- The complete encoding is a sub-region of its prefix encoding, with each parent region consisting of four sub-regions. For example, `00`, `01`, `02`, and `03` are sub-regions of `0`, and the union of the sub-regions equal to the region of the prarent's.
- Numerically continuous values are also geographically adjacent, for example, the range of regions for `00` and `01` is adjacent, and the range of regions for `0122` and `0123` is also adjacent

## Encoding accuracy

The Hilbert curve encoding in S2 consists of 30 bytes, each representing a layer partition. The following table shows the area and number of individual cells in each layer.

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


## Data Storage

In Pegasus, the key for data storage is combined by hashkey and sortkey: hashkey is used to determine the partition where the data is located. Data belongs to the same hashkey is stored in a logically contiguous area in the same Replica Server, and sortkey is used to sort the data in this area.

After converting the longitude and latitude coordinates to obtain the one-dimensional encoding `CellId`, this one-dimensional encoding can be stored as a key for **GEO index data**. Pegasus divides this one-dimensional encoding into two parts: hashkey and sortkey, and different byte partitioning strategies can be adopted according to actual user scenarios.

GEO index data is independent of the original data, and the two types of data are stored in different Pegasus tables. Pegasus uses [GEO Client](https://github.com/apache/incubator-pegasus/blob/master/src/geo/lib/geo_client.h) to synchronize data for the two tables, and supports access to both native Pegasus API and GEO API.

So, when using the Pegasus GEO feature, it is necessary to create two Pegasus tables: one is the original table to store the raw data written by the user, and the other is the GEO index table to store the GEO index data generated by the GEO client's automatic conversion of raw data.

### hashkey

Hashkey is composed of one-dimensional encoded prefixe. For example, in a user scenario, setting the hashkey length to `14` (1-byte face, 1-byte delimiter `/`, 12 byte Hilbert encoding) can achieve better performance.

> So, the **minimum search layer** is 12

```
              CellId
|1/223320022232..................|
|-------------32 bytes-----------|
|---14 bytes--|
    hashkey
```

### sortkey

To meet the requirements of queries with different radius ranges and precisions, we put all the remaining 18 bytes of CellId into the sortkey.
- If the query is over larger radius ranges, take fewer sortkey bytes (corresponding to shorter CellId) as prefixes for data scan queries, which can reduce the number of data scans
- If the query is over smaller radius ranges or point queries, take more sortkey bytes (corresponding to longer CellId) as prefixes for data scan queries, which can reduce the range of data scans

This can maintain high flexibility in the application layer without modifying the underlying stored data.

> When querying data within the same geographical area (such as a circular area), using shorter CellIds to query data has larger ranges and fewer queries, but yields more useless data outside the area. Using longer CellIds to query data results in smaller range of queries, resulting in less useless data outside the region, but with higher number of queries
>
> refer to: [S2 coverings](http://s2geometry.io/devguide/examples/coverings)

Although the area of the cell is already small enough ( < 1cm^2) at the 30th layer, it is still possible for two POI data to fall into the same cell, so it is necessary to solve the key conflict problem based on CellId encoding. Pegasus combines the hashkey and sortkey of the original table and appends them to the sortkey of the GEO data table.

```
               CellId
|1/223320022232200331010110113301|
|-------------32 bytes-----------|
|---14 bytes--||-----18 bytes----||--原始hashkey--||--原始sortkey--|
|-GEO hashkey-||-------------------GEO sortkey-------------------|
```

### value

When using the Pegasus GEO feature, the value must be able to extract longitude and latitude, and the extract method can be found in [Value Extrator](/api/geo#value_extrator).

The value of the GEO index table is exactly the same as the value of the original table, so there will be redundant data. Here, trades space for time to avoid secondary indexing.

> If there is a need to store large data in a single POI data and you want to save disk space, you can manually implement secondary indexing, which means storing the key of the secondary index in the GEO value and then storing the actual large value in another table.

## Data updates

### set

`set` operation will simultaneously update the data of the two tables mentioned above, namely the Pegasus raw table data and GEO index table data, and the data generation method is also described above.

The hashkey and sortkey of the `set` operation are in the user's own format and are not constrained when using the GEO APIs. The data synchronization of two tables is transparent to users and is automatically completed by the GEO client.

When using the Redis GEO API, refer to [GEO API](/api/redis#geo-api)。

In the Pegasus implementation, the `set` operation first attempts to read and retrieve existing data. If the data does not exist, it directly writes data to both tables. If the data already exists, the old GEO index data will be cleaned up before writing new data. Because the index data `<hashkey, sortkey>` of new and old data may be different (i.e., the longitudes and latitudes obtained by the extractor for new and old values are different). If not cleaned up, there will be garbage and dirty data in the GEO index table, causing waste of disk space and dirty data will also be found during geographic range queries (i.e. `GEORADIUS`).

### del

The `del` operation will delete data from both tables simultaneously, following the same principle above.

## Data queries

### Design

Geographic range queries will be converted into multiple scan operations by Pegasus, with each scan corresponding to all data scans within a CellId range. To achieve higher performance, it is necessary to reduce the total number of scan operations and the amount of data per scan operation, which means reducing the total number of CellIds and the area of a single CellId.

For example, when performing a range query with the red circle, the CellId query set with a blue blocks can be used as:

![s2_cap_1.png](/assets/images/s2_cap_1.png){:class="img-responsive"}

Although such results are more accurate, but there are more CellIds involved in the calculation, resulting in more client-server RPCs, higher network overhead, and higher latency. In addition, in real usage scenarios, CellId that is too small may not have POI data, but it will still consume one RPC.

So, in the current Pegasus implementation, only two layers of cells, the `minimum search layer` and the `maximum search layer`, are used together. Taking layers 12 and 16 as examples, the CellId query set obtained is shown in the blue blocks as:

![s2_cap_2.png](/assets/images/s2_cap_2.png){:class="img-responsive"}

### 查询流程

以`search_radial`为例，此 API 的意义是给定点和半径，查询出该圆形区域内的所有数据。

> 这里我们只讨论圆形区域的数据查询，其他的比如多边形区域的思想是类似的。

需利用 S2 提供的查询覆盖指定区域的 CellId 集合的 API：

```
// Returns an S2CellUnion that covers the given region and satisfies the current options.
S2CellUnion GetCovering(const S2Region& region);
```

> `search_radial` API 有两个重载函数，一个是输入经纬度，一个是输入 hashky + sortkey，后者是通过 key 取到 value 中的经纬度再转调前者。

查询流程如下:

1. 根据经纬度、半径，求出 S2Cap 圆形区域`C`
2. 根据圆形区域、指定的`最小搜索层`，通过`GetCovering`，求出在`最小搜索层`上的 CellId 集合
3. 遍历这些 CellId，判断 CellId 区域跟圆形区域`C`的关系
    1. 全覆盖：取该 CellId 内的所有数据
    2. 半覆盖：将该 CellId 按`最大搜索层`继续拆分，判断拆分后的 sub_CellId 区域与圆形区域`C`的关系
        1. 覆盖/相交：取该 sub_CellId 的所有数据
        2. 不相交：丢弃

> `最小搜索层`，`最大搜索层`的配置参考后文。
> `最小搜索层`的 CellId 长度确定 GEO 索引表的 hashkey 长度。

取一个 CellId 的所有数据时，会根据上文的 key 构造规则，构造一对包含这个 CellId 所有数据的`start_sortkey`，`stop_sortkey`，再使用Pegasus的`scan`接口进行数据搜索。

- 对于`3.1`步取到的`最小搜索层` CellId 的编码，它也就是 GEO 索引表中的 hashkey，调用`scan(CellId, "", "")`查询所有数据
    - 比如，一个 12 层的 cell `1/223320022232`被区域完全覆盖，则调用`scan("1/223320022232", "", "")`查询所有数据
- 对于`3.2.1`步取到的 sub_CellId 集合，hashkey 是它的前缀，调用`scan(sub_CellId_common_prefix, sub_CellId1, sub_CellId2)`搜索数据
    - 其中，sub_CellId_common_prefix 是 sub_CellId 集合的公共前缀，长度是 hashkey 的长度。sub_CellId1 和 sub_CellId2 之间连续的所有 sub_CellId 都在集合中，字符串长度是`最大搜索层`减`最小搜索层`的长度
    - 比如，一个12层的 cell `1/223320022232`的子区域`0001`,`0002`,`0003`,`0100`才跟目标区域相交时，则调用`scan("1/223320022232", "0001", "0003")`、`scan("1/223320022232", "0100", "0100")`

得到`scan`的结果后，还需处理：

- 计算距离：因为 CellId 可能只与输入区域部分重合，该点若在区域外，需丢弃
- 排序：当有升序/降序要求时

### 灵活性

由于我们存储了完整的 30 层 CellId，所以在实际使用中，可以按照自己的地理数据密度、网络 IO、磁盘 IO等情况调整 API 的`最大搜索层`。

> `最大搜索层`默认为`16`。

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

由于`最小搜索层`确定了 hashkey 的长度，数据一旦写入 Pegasus 后，`最小搜索层`便不可修改了，因为数据已按这个 hashkey 长度规则固化下来。

若要修改，需要重建数据。

> 默认为`12`。

```
[geo_client.lib]
;NOTE: 'min_level' is immutable after some data has been inserted into DB by geo_client.
min_level = 12
```

## 自定义extrator

目前 Pegasus 支持从固定格式的 value 中解析出经纬度。经纬度以字符串形式嵌入在 value 中，以`|`分割。

比如:`.*|115.886447|41.269031|.*`，经纬在 value 中的索引由配置文件中的`latitude_index`和`longitude_index`确定。

## API & Redis Proxy

Pegasus GEO 特性的使用有两种方式，一是直接使用 C++ GEO Client，二是使用 Redis Proxy。

[C++ GEO client代码](https://github.com/apache/incubator-pegasus/blob/master/src/geo/lib/geo_client.h)中有详细的 API 说明，这里不再赘述。

## 配置文件

Redis Proxy 的使用请参考[Redis适配](redis)。

GEO API 添加的配置文件如下:

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

有的使用场景是用户已经有普通的 KV 数据，需要根据这份已有的 KV 数据转换成如上述的数据格式，我们可以使用 shell 工具里的[copy_data](/docs/tools/shell/#copy_data)功能来实现。比如：

在进行`copy_data`操作之前，目标集群以及两个目标表（例如，原始数据表`temp`，GEO 索引数据表 `temp_geo`）都需要提前创建好。

```
copy_data -c target_cluster -a temp -g
```

数据导入完成后就可以搭建 Redis Proxy 了，具体的说明参考[Redis适配](redis)，需要注意的是配置项：

```
[apps.proxy]
; if using GEO APIs, an extra table name which store geo index data should be appened, i.e.
arguments = redis_cluster temp temp_geo
```

## Benchmark

### 测试环境

服务器配置：

- CPU：E5-2620v3 *2
- 内存：128GB
- 存储：480G SSD *8
- 网卡：1Gb

集群配置：

- 节点数：5 个 Replica Server 节点（使用 v1.9.2 版本）
- 测试表的 Partition 数：128
- 单条数据大小：120 字节

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
- lat_degrees、lng_degrees：每次都选取北京五环内的随机点
- radius_m：如下表第一列，单位米
- count：-1，表示不限定结果数量
- sort_type：不排序

### 测试结果

| Radius(m) | P50(ms)     | P75(ms)     | P99(ms)     | P99.9(ms)   | Avg result count | QPS per node |
|-----------|-------------|-------------|-------------|-------------|------------------|--------------|
| 50        | 1.63071622  | 1.84607433  | 4.04545455  | 6.28        | 9.4608           | 740.287      |
| 100       | 1.76        | 2.33614794  | 5.4         | 6.45319149  | 38.0296          | 656.66       |
| 200       | 2.41017042  | 3.31062092  | 6.41781609  | 9.60588235  | 154.3682         | 536.624      |
| 300       | 3.30833333  | 4.21979167  | 9.4310559   | 18          | 350.9676         | 434.491      |
| 500       | 5.07763975  | 6.84964682  | 16.84931507 | 21.78082192 | 986.0826         | 347.231      |
| 1000      | 12.28164727 | 18.70972532 | 43.18181818 | 57.049698   | 3947.5294        | 204.23       |
| 2000      | 35.78666667 | 54.7300885  | 108.7331378 | 148.616578  | 15674.1198       | 98.7633      |
