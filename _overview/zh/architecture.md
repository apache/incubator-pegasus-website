---
permalink: /overview/architecture
---

## 整体架构

Pegasus系统的整体架构如下图所示，一共分为四个部分：

- **ClientLib**：负责屏蔽数据到存储服务器的映射规则，以及和存储服务器的通信细节，而提供一个简洁的Key-Value存储接口供用户使用
- **ReplicaServer**：负责数据的存储和备份，接收客户端发来的数据存储请求
- **MetaServer**：负责ReplicaServer的存活检测、Replica分配、负载均衡等，采用一主多备模式
- **Zookeeper**：负责对MetaServer进行选主，以实现Master节点的高可用，并存储系统的各种元数据

![pegasus-architecture-components](/assets/images/pegasus-architecture-components.png){:class="img-responsive"}

## ReplicaServer

ReplicaServer主要负责数据存储和存取，以replica为单位进行服务：

- 服务的replica既可能是PrimaryReplica，也可能是SecondaryReplica
- 底层使用RocksDB来存储数据
- 管理commit log，并实现replication协议，提供数据一致性保证

## MetaServer

MetaServer采用一主多备模式（one master, multiple backups），所有的状态都会持久化到Zookeeper上；同时通过Zookeeper进行选主。当master故障后，另一台backup立即抢到锁，然后从Zookeeper上恢复状态，成为新的master。MetaServer负责的功能包括：

- 系统初始化
- ReplicaServer的管理
- Replica的分配、管理和负载均衡调度
- Table的创建与删除
- 响应Client请求，向Client提供最新的路由表

## Zookeeper

Zookeeper主要有两个功能：

- 系统元信息存储
- MetaServer选主

## ClientLib

ClientLib对用户提供数据存储接口，特点：

- 接口简洁：对用户提供最简单的接口，将寻址和容错等细节封装在内部
- 配置简单：用户只需通过配置文件指定MetaServer地址列表，就可以访问集群，类似于Zookeeper
- 尽量直接与ReplicaServer进行交互，尽量少地访问MetaServer以避免热点问题，不依赖Zookeeper
