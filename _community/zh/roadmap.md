---
title: Roadmap
layout: page
---

### Pinned WIP (Work-In-Progress)

-----

#### 高效运维

* Partition Split：[XiaoMi/rdsn#69](https://github.com/XiaoMi/rdsn/issues/69)
* 跨机房热备：[XiaoMi/rdsn#118](https://github.com/XiaoMi/rdsn/pull/118)
* 数据快速批量导入：[XiaoMi/pegasus#139](https://github.com/XiaoMi/pegasus/issues/139)
* Capacity Unit统计：[XiaoMi/pegasus#235](https://github.com/XiaoMi/pegasus/issues/235)

#### 用户接口

* 客户端版本协商：[XiaoMi/pegasus#256](https://github.com/XiaoMi/pegasus/issues/256)
* 客户端支持DNS寻址：[XiaoMi/pegasus-java-client#30](https://github.com/XiaoMi/pegasus-java-client/issues/30)
* 身份认证：[xiaomi/pegasus#166](https://github.com/xiaomi/pegasus/issues/166)

#### 部署支持

* docker support：[XiaoMi/pegasus#140](https://github.com/XiaoMi/pegasus/issues/140)

#### 性能优化

* 客户端支持warmup功能：[XiaoMi/pegasus-java-client#26](https://github.com/XiaoMi/pegasus-java-client/issues/26)
* 客户端支持backup request：[XiaoMi/pegasus#251](https://github.com/XiaoMi/pegasus/issues/251)
* RPC 大包处理优化

#### 重构化简

* [XiaoMi/rdsn#141](https://github.com/XiaoMi/rdsn/issues/141)

-----

### In plan

* 离线计算框架支持解析 Pegasus 的冷备份数据：[XiaoMi/pegasus#264](https://github.com/XiaoMi/pegasus/issues/264)
* 冷备份支持通过 Fuse 备份至 HDFS：[XiaoMi/pegasus#136](https://github.com/XiaoMi/pegasus/issues/136)
* 写放大优化(WiscKey&HashKV)：[XiaoMi/pegasus#265](https://github.com/XiaoMi/pegasus/issues/265)
* Rack Awareness：[XiaoMi/pegasus#321](https://github.com/XiaoMi/pegasus/issues/321)
* 磁盘均衡分布： [XiaoMi/pegasus#261](https://github.com/XiaoMi/pegasus/issues/261)
* 权限管理（ACL）：[XiaoMi/pegasus#170](https://github.com/XiaoMi/pegasus/issues/170)
* 离线计算框架支持生成 Pegasus 的冷备份数据
* OpenTsDB 监控支持
* 移除shared log
* REST Proxy
* 支持 Partition Set
