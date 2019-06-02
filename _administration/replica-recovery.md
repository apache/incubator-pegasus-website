---
title: Replica数据恢复
layout: page
menubar: administration_menu
---

# 原理

通常来说，Pegasus的数据会存储3个副本。对于每个partition，正常情况下应当都有一主两备3个replica提供服务。

但是，集群不可避免会发生节点宕机、网络异常、心跳失联等情况，造成副本丢失，对服务可用性产生影响。副本丢失的程度会影响读写的能力（在[负载均衡](负载均衡#概念篇)里也有介绍）：
* 一主两备都可用：partition完全健康，可以**正常读和写**。
* 一主一备可用：根据PacificA一致性协议，同样可以**安全地读和写**。
* 只有一主可用：此时**不可写**，但是**可读**。
* 全部不可用：此时**不可读写**。这种情况我们称之为**DDD**，即Dead-Dead-Dead的缩写，表示3个副本都不可用。

以上情况中，除了**全部不可用的DDD状态**，其他情况下MetaServer都能自动补充副本，并最终恢复至完全健康状态。但是如果partition进入DDD状态，MetaServer就无法对其进行自动恢复，需要进行人工干预。

[这个讨论](https://github.com/XiaoMi/rdsn/issues/80)中给出了进入DDD状态的例子。实际上，**只要某个partition进入DDD状态，且LastDrop的最后两个节点中有一个节点无法正常启动，就会进入需要人工干预的DDD状态**。而在线上集群多个节点的起起停停过程中，这种情况是很容易出现的。

可以通过Shell工具的`ls -d`命令查看健康状况，如果`read_unhealthy`的个数大于0，就表示有partition进入了DDD状态。

# DDD诊断工具

从版本[1.11.0](https://github.com/XiaoMi/pegasus/releases/tag/v1.11.0)开始，Pegasus在Shell工具中提供了`ddd_diagnose`命令，以支持DDD自动诊断功能。

命令用法：
```
ddd_diagnose [-g|--gpid appid|appid.pidx] [-d|--diagnose] [-a|--auto_diagnose]
             [-s|--skip_prompt] [-o|--output file_name]
```

参数说明：
* `-g`：指定app_id或者partition_id，譬如`-g 1`或者`-g 1.3`；如果不指定，则对所有表执行操作。
* `-d`：进入诊断模式；如果不指定，则只显示DDD情况，但不进行诊断。
* `-a`：开启自动诊断，即在保证数据一致性前提下，如果诊断工具能寻找到合适的备份作为该partition的主备份，则自动将其设置为primary，完成数据恢复，无需人工干预。
* `-s`：避免交互模式；如果不指定，则在进行诊断的过程中可能会要求用户输入信息，以完成选择、确认、或者信息补充。
* `-o`：将结果输出到指定文件。

使用示例（如果看不清楚，请在单独的页面中打开图片）：
![ddd-diagnose](https://github.com/XiaoMi/pegasus/blob/master/docs/media-img/ddd-diagnose.png)

上图是使用`ddd_diagnose`命令时的输出，我们通过红色的箭头标识依次进行说明：
* 1：当前正在诊断的partition id。
* 2：该partition在zookeeper上持久化的`ballot`和`last_committed_decree`信息，但是由于持久化不是实时的，该值可能小于实际值。
* 3：dropped列表，列举曾经服务过该partition的节点的状态信息，重点关注：
  * alive：该节点是否可用。
  * ballot：该partition在该节点上replica的实际`ballot`；如果为-1，表示该partition在该节点上不存在数据。
  * last_committed：该partition在该节点上replica的实际`last_committed_decree`。
  * last_prepared：该partition在该节点上replica的实际`last_prepared_decree`。
  * 最后如果有`<==`，表示该节点是 **最后一个变得不可用**（the latest） 还是 **倒数第二个变得不可用**（the secondary latest）。
* 4：last_drops列表，记录节点变得不可用的时间顺序。
* 5：ddd_reason，表示该partition变成DDD状态的原因。
* 6：recommanded_primary，诊断工具在保证数据一致性的前提下推荐的新primary；如果无法给出，则为`none`。
* 7：如果第6步给出了推荐节点，则提示用户采取下一步操作（如果指定了`-a`或者`-s`选项，则不会进入这一步，相当于总是自动选择y）：
  * y：采用该推荐节点作为新的primary。
  * n：不采用该推荐节点，而是让用户选择其他的节点。
  * s：忽略对该partition的诊断。
* 8：如果第6步没有给出推荐节点或者第7步选择了n，则提示用户输入新的节点作为primary。
* 9：生成propose命令，发送给MetaServer，将节点指定为新的primary，对该partition进行恢复。
* 10：收到propose命令的回复，`ERR_OK`表示执行成功。
* 11：显示当前已经完成的进度，分子为已经完成诊断的个数，分母为需要进行诊断的总个数。

**推荐用法**：
* `ddd_diagnose -d -a`，即开启自动诊断，对于无法自动完成诊断的partition，通过与用户交互来获得人工干预。这是最简单省心的用法，在大部分情况下都能自动完成恢复过程，无需人工干预。

在无法完成自动诊断的情况下，会进入上图中的第8步，需要用户输入新的节点作为primary。那么，在dropped列表的众多节点中，如何选择最合适的节点作为primary呢？我们的建议是：
* **在所有alive为true的节点中，选择`last_prepared`值最大的节点**，因为这样能尽可能多地恢复数据，减少数据丢失的可能性。