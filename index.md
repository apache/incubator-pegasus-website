---
title: Pegasus
subtitle: 易伸缩，强一致，高效的，开源分布式Key-Value存储
layout: page
---

## 概览

Pegasus是小米云存储团队开发的一个分布式Key-Value存储系统，最初的动机是弥补HBase在可用性和性能上的不足。Pegasus系统的Server端完全采用C++语言开发，使用PacificA协议支持强一致性，使用RocksDB作为单机存储引擎。

因为使用C++编写，Pegasus避免了使用Java所带来的GC影响和虚拟机开销。而由于不依赖外部文件系统，Pegasus的IO路径更短，延迟通常更加稳定可控。

模型设计上，Pegasus使用哈希分片进行数据的拆分，分片（Partition）是系统内部数据迁移的最小单元，每一分片内的数据有序存储，各个分片之间数据隔离，每个分片对应一个单独的 RocksDB 实例。

Pegasus提供了一系列丰富的功能支持，如快照冷备份，表的软删除，表级写限流等等，在小米的生产环境中均经过应用和验证。

## 安装构建

Pegasus目前只支持在Linux平台运行。当前我们提供如下几种安装方式：

- **下载 Release 包**

在 https://github.com/XiaoMi/pegasus/releases 下载二进制包。

如对于1.11.3版本而言，你可以下载：[pegasus-1.11.3-b45cb06-linux-x86_64-release.zip](https://github.com/XiaoMi/pegasus/releases/download/v1.11.3/pegasus-1.11.3-b45cb06-linux-x86_64-release.zip)，这其中包含我们用于搭建系统所需要的全部组件。

现在Pegasus依然处于快速迭代状态，建议你使用时选择最新版本。

- **手动编译**

请参照在 [编译构建](https://github.com/XiaoMi/pegasus/wiki/%E7%BC%96%E8%AF%91%E6%9E%84%E5%BB%BA) 页面中的指示进行编译。

- **下载 Docker 镜像**

尚未支持，敬请期待

## 立即开始

你可以参照右侧目录检索你想要了解的内容。如果你对Pegasus完全陌生，可以首先阅读[系统介绍](https://github.com/XiaoMi/pegasus/wiki/%E7%B3%BB%E7%BB%9F%E4%BB%8B%E7%BB%8D)，并通过[体验onebox集群](https://github.com/XiaoMi/pegasus/wiki/%E4%BD%93%E9%AA%8Conebox%E9%9B%86%E7%BE%A4)来熟悉Pegasus的各项功能。配合阅览下方的分享 PPT 口味更佳。

## 社区分享

* 2018年10月分享：《深入了解Pegasus》
  * [【PPT下载】](https://github.com/XiaoMi/pegasus/raw/master/docs/ppt/Pegasus_Intro_2018_10.pptx)
* 2018年7月分享：《Pegasus分布式KV系统——让用户专注于业务逻辑》
  * [【PPT下载】](https://github.com/XiaoMi/pegasus/raw/master/docs/ppt/Pegasus_Intro_2018_07.pptx)
* [ArchSummit深圳2017全球架构师峰会](https://sz2017.archsummit.com/presentation/969)：《分布式实现那些事儿——Pegasus背后的故事》
  * [【PPT下载】](https://github.com/XiaoMi/pegasus/raw/master/docs/ppt/ArchSummit_Shenzhen_2017.pptx)  [【文字记录】](http://www.sohu.com/a/198828662_355140)  [【视频播放】](http://p.bokecc.com/playvideo.bo?vid=2BBEA348D0B369459C33DC5901307461&uid=0575C033D2012A28&playerid=&playertype=&mediatype=)
* [ArchSummit北京2016全球架构师峰会](http://bj2016.archsummit.com/presentation/3023)：《从Pegasus看分布式系统的设计》
  * [【PPT下载】](https://github.com/XiaoMi/pegasus/raw/master/docs/ppt/ArchSummit_Beijing_2016.pptx)  [【文字记录】](http://www.sohu.com/a/133403216_683783)  [【视频播放】](https://v.qq.com/x/page/s03886w5d16.html)
