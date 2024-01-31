---
permalink: administration/bad-disk
---

磁盘故障时有发生，通常有下列检查方式：

- 可能是某节点的延迟明显高于其他节点，追其原因，如果看到某个 SSD 的 IO await 明显较高，
  那基本说明该磁盘是“慢盘”。

- 平时的周期运维检修也容易发现潜在的磁盘故障。

在Pegasus中，我们如何进行坏盘维修的操作？

## 坏盘黑名单

Pegasus 支持磁盘黑名单，如果你要下线某块磁盘，首先要把它定义在其所在 Replica 节点的黑名单文件中，
黑名单文件的所在路径依据配置：

```ini
[replication]
    data_dirs_black_list_file = /home/work/.pegasus_data_dirs_black_list
```

接着你登录对应节点，编辑 /home/work/.pegasus_data_dirs_black_list:

```txt
/home/work/ssd2
/home/work/ssd3
```

上面标注磁盘 ssd2 与 ssd3 需要下线。

## 重启节点

在你标注好坏盘名单后，你可以通过 [高可用重启](rolling-update#高可用重启) 单独重启对应节点的服务进程。
通常你在程序日志中能够看到下列记录，表示黑名单内的磁盘的确被忽略了：

```log
D2019-07-10 21:54:28.879 (1562766868879176673 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:177:initialize(): data_dirs_black_list_file[/home/work/.pegasus_data_dirs_black_list] found, apply it
D2019-07-10 21:54:28.879 (1562766868879300907 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:194:initialize(): black_list[1] = [/home/work/ssd2/]
D2019-07-10 21:54:28.879 (1562766868879312394 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:194:initialize(): black_list[2] = [/home/work/ssd3/]
W2019-07-10 21:54:28.879 (1562766868879404635 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:218:initialize(): replica data dir /home/work/ssd2/pegasus/c3tst-dup2/replica is in black list, ignore it
W2019-07-10 21:54:28.879 (1562766868879411121 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:218:initialize(): replica data dir /home/work/ssd3/pegasus/c3tst-dup2/replica is in black list, ignore it
D2019-07-10 21:54:28.879 (1562766868879415865 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:220:initialize(): data_dirs[0] = /home/work/ssd4/pegasus/c3tst-dup2/replica, tag = ssd4
D2019-07-10 21:54:28.879 (1562766868879422843 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:220:initialize(): data_dirs[1] = /home/work/ssd5/pegasus/c3tst-dup2/replica, tag = ssd5
D2019-07-10 21:54:28.879 (1562766868879428846 9e8d) replica.default0.00009e5b00010001: replication_common.cpp:220:initialize(): data_dirs[2] = /home/work/ssd6/pegasus/c3tst-dup2/replica, tag = ssd6
```
