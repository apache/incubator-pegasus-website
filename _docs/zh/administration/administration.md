---
permalink: administration/index.html
---

Pegasus 不仅仅只提供简单的 key value 存储接口，我们还基于稳定性考虑，增加了许多有助于高效运维的特性。

如果你刚开始使用 Pegasus，想要把已编译好的系统部署在你的机器上，你首先需要参考 [配置管理](config.md)，
根据环境来调整参数。然后你应该参考 [集群部署](deployment.md) 将 Pegasus 搭载在你的机器集群上。

在成功部署后，你应该着重观察系统运行情况，参考 [可视化监控](monitoring.md) 来查看相关指标。

在服务运行后，偶然的异常(可能是网络，磁盘，系统故障，潜在 Bug 导致的异常)会使集群抖动。如果造成了节点负载不均衡，你可以参照 [负载均衡](rebalance.md) 进行操作。

如果是随着业务量增大，超出了你的服务资源所能承受的能力，你可以参照 [集群扩容缩容](scale-in-out.md) 来增加节点数。
如果有机器发生持久性的故障，你也可以参照 [集群扩容缩容](scale-in-out.md) 剔除这个坏节点。
如果是机器的某个SSD盘出故障，可以参照 [坏盘检修](bad-disk.md) 剔除这个坏盘。

如果需要升级集群，请参照 [集群升级](rolling-update.md)。

集群运行过程中，你需要时刻关注资源（磁盘、内存、网络）的使用情况，并及时做出运维调整，请参照 [资源管理](resource-management.md)。

如果业务数据量很大或者单条value很长，你可以参照 [数据压缩](compression.md) 来提高磁盘利用率和提升读写性能。

对一些重要的业务，你可以将相关的表定期进行 [冷备份](cold-backup.md) 来保证数据安全性。冷备份的功能也常常用作于快速的大量数据迁移。

对于一些极端情况，譬如元数据丢失、多个节点同时宕机，可能会造成集群数据的不一致。
如果元数据丢失，建议你参考 [元数据恢复](meta-recovery.md)；对于数据备份丢失造成的不一致，建议你参考 [Replica数据恢复](replica-recovery.md)。

如果集群要依赖一个新的Zookeeper，需要迁移Zookeeper数据，请参考 [Zookeeper迁移](zk-migration.md)。

通常一个集群内会服务于许多表，所有的表都有相同的优先级，换言之，有某个表的请求量过大，
其他表的服务质量就会下滑，这通常被称为 “多租户” 问题，你可以通过 [流量控制](throttling.md) 满足每个表的 SLA。

如果要迁移一个表的数据到另外一个表，请参考 [Table迁移](table-migration.md)。

表级的运维操作还包括 [Table软删除](table-soft-delete.md) 、[Table环境变量](table-env.md)、[Partition Split](partition-split.md)、[Manual Compact功能](manual-compact.md)、[Usage Scenario功能](usage-scenario.md) 等。

除此之外，我们还支持了 [远程命令](remote-commands.md)，方便运维人员对Server进行直接控制，并提供了 [HTTP接口](/_docs/zh/api/http.md)。

我们在运维集群服务业务的过程中，也积累了很多 [运维经验](experiences.md)，你可以参考。
