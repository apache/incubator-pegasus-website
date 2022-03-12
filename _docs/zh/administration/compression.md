---
permalink: administration/compression
---

# 客户端压缩

请参考 [Java客户端文档#数据序列化](/_docs/zh/clients/java-client.md#数据序列化) 和 [Java客户端文档#数据压缩](/_docs/zh/clients/java-client.md#数据压缩) 。

# 服务端压缩

**把总结放在最前面：**
* 对于CPU比较空闲的场景，建议采用压缩率高的`zstd`算法。
* 对于CPU比较繁忙的场景，建议采用综合性能比较优异的`lz4`算法。

Pegasus服务端支持的压缩算法：
* snappy
* lz4 (从v1.11.2版本开始支持)
* zstd (从v1.11.2版本开始支持)

通过[配置文件](config)来配置压缩算法，譬如：
```ini
[pegasus.server]
    rocksdb_compression_type = lz4
```

不同压缩算法的比较（数据来自[zstd官方的benchmark](https://facebook.github.io/zstd/)）：

Compressor name | Ratio | Compression(MB/s) | Decompress(MB/s)
-- | -- | -- | --
zstd 1.3.4 -1 | 2.877 | 470 | 1380
zlib 1.2.11 -1 | 2.743 | 110 | 400
brotli 1.0.2 -0 | 2.701 | 410 | 430
quicklz 1.5.0 -1 | 2.238 | 550 | 710
lzo1x 2.09 -1 | 2.108 | 650 | 830
lz4 1.8.1 | 2.101 | 750 | 3700
snappy 1.1.4 | 2.091 | 530 | 1800
lzf 3.6 -1 | 2.077 | 400 | 860

![compression-comparation.png](/assets/images/compression-comparation.png){:class="img-responsive"}

这个结果与[lz4官方的benchmark](https://github.com/lz4/lz4#benchmarks)也是一致的。

附上[RocksDB的压缩建议](https://github.com/facebook/rocksdb/wiki/Compression)：
> Use options.compression to specify the compression to use. By default it is Snappy. We believe LZ4 is almost always better than Snappy. We leave Snappy as default to avoid unexpected compatibility problems to previous users. LZ4/Snappy is lightweight compression so it usually strikes a good balance between space and CPU usage.

> If you want to further reduce the in-memory and have some free CPU to use, you can try to set a heavy-weight compression in the latter by setting options.bottommost_compression. The bottommost level will be compressed using this compression style. Usually the bottommost level contains majority of the data, so users get almost optimal space setting, without paying CPU for compress all the data ever flowing to any level. We recommend ZSTD. If it is not available, Zlib is the second choice.

> If you want have a lot of free CPU and want to reduce not just space but write amplification too, try to set options.compression to heavy weight compression type. We recommend ZSTD. Use Zlib if it is not available.

