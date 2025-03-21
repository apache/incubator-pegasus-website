---
permalink: administration/compression
---

# Compression on the client side

Please refer to the [Java client - Data Serialization](/clients/java-client#data-serialization) and [Java client - Data Compression](/clients/java-client#data-compression).

# Compression on the server side

It's recommended:
* For the server with low CPU load, use the `zstd` algorithm with the highest compression ratio.
* For the server with high CPU load, use the `lz4` algorithm with good compression rate and speed.

The compression algorithms supported by the Pegasus server:
* snappy
* lz4 (Since Pegasus v1.11.2)
* zstd (Since Pegasus v1.11.2)

Configure the compression algorithm through [Configurations](config), for example:
```ini
[pegasus.server]
    rocksdb_compression_type = lz4
```

Comparison of different compression algorithms (from [zstd official benchmark](https://facebook.github.io/zstd/)):

| Compressor name  | Ratio | Compression (MB/s) | Decompress (MB/s) |
|------------------|-------|--------------------|-------------------|
| zstd 1.3.4 -1    | 2.877 | 470                | 1380              |
| zlib 1.2.11 -1   | 2.743 | 110                | 400               |
| brotli 1.0.2 -0  | 2.701 | 410                | 430               |
| quicklz 1.5.0 -1 | 2.238 | 550                | 710               |
| lzo1x 2.09 -1    | 2.108 | 650                | 830               |
| lz4 1.8.1        | 2.101 | 750                | 3700              |
| snappy 1.1.4     | 2.091 | 530                | 1800              |
| lzf 3.6 -1       | 2.077 | 400                | 860               |

![compression-comparation.png](/assets/images/compression-comparation.png){:class="img-responsive"}

This result is consistent with [lz4 official benchmark](https://github.com/lz4/lz4#benchmarks).

[Compression algorithm suggestions from RocksDB official](https://github.com/facebook/rocksdb/wiki/Compression):
> Use options.compression to specify the compression to use. By default it is Snappy. We believe LZ4 is almost always better than Snappy. We leave Snappy as default to avoid unexpected compatibility problems to previous users. LZ4/Snappy is lightweight compression so it usually strikes a good balance between space and CPU usage.

> If you want to further reduce the in-memory and have some free CPU to use, you can try to set a heavy-weight compression in the latter by setting options.bottommost_compression. The bottommost level will be compressed using this compression style. Usually the bottommost level contains majority of the data, so users get almost optimal space setting, without paying CPU for compress all the data ever flowing to any level. We recommend ZSTD. If it is not available, Zlib is the second choice.

> If you want have a lot of free CPU and want to reduce not just space but write amplification too, try to set options.compression to heavy weight compression type. We recommend ZSTD. Use Zlib if it is not available.
