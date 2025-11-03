---
permalink: administration/index.html
---

Pegasus not only provides simple key-value storage interfaces; based on stability considerations, we have added many features that help efficient operations and maintenance.

If you are new to Pegasus and want to deploy the compiled system on your machines, you should first refer to [Configuration Management](config) to adjust parameters according to your environment. Then refer to [Cluster Deployment](deployment) to deploy Pegasus on your machine cluster.

After a successful deployment, you should focus on observing the system’s runtime status. Refer to [Monitoring](monitoring) to view the relevant metrics.

During service operation, occasional anomalies (possibly due to network issues, disk failures, system errors, or potential bugs) may cause cluster fluctuations. If this results in uneven node load, you can perform operations according to [Load Balancing](rebalance).

If business volume grows beyond what your service resources can handle, you can increase the number of nodes by following [Scale In/Out](scale-in-out). If a machine experiences persistent failure, you can also remove the bad node via [Scale In/Out](scale-in-out). If a specific SSD disk on a machine fails, refer to [Bad Disk Maintenance](bad-disk) to remove the faulty disk.

If you need to restart or upgrade the cluster, please refer to [Rolling Update](rolling-update).

During cluster operation, you must continuously monitor resource usage (disk, memory, network) and make timely operational adjustments. Please refer to [Resource Management](resource-management).

If the business data volume is large or individual values are long, refer to [Compression](compression) to improve disk utilization and boost read/write performance.

For some critical businesses, you can regularly perform [Cold Backup](cold-backup) on related tables to ensure data safety. The cold backup feature is also often used for fast large-scale data migration.

In extreme situations, such as metadata loss or multiple nodes failing simultaneously, the cluster may become inconsistent. If metadata is lost, refer to [Meta Recovery](meta-recovery); if inconsistencies are caused by backup loss, refer to [Replica Recovery](replica-recovery).

If the cluster needs to rely on a new ZooKeeper and migrate ZooKeeper data, please refer to [ZooKeeper Migration](zk-migration).

Typically, a cluster serves many tables, and all tables have the same priority. In other words, if a certain table’s request volume becomes excessive, the service quality of other tables will decline. This is commonly called a “multi-tenancy” problem. You can use [Throttling](throttling) to meet each table’s SLA.

If you need to migrate a table’s data to another table, please refer to [Table Migration](table-migration).

Table-level operational tasks also include [Table Soft Delete](table-soft-delete), [Table Environment Variables](table-env), [Partition Split](partition-split), [Manual Compaction](manual-compact), and [Usage Scenario](usage-scenario).

In addition, we support [Remote Commands](remote-commands) for administrators to directly control servers, and provide an [HTTP API](http).

From our experience operating cluster services for various businesses, we have accumulated many [Operational Experiences](experiences) for your reference.
