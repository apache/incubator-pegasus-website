---
permalink: administration/bad-disk
---

# 坏盘故障排查

磁盘故障时有发生，可通过以下方法检查：

- 在 Replica Server 日志中，发现有某块磁盘的 IO error 错误
- 可能是某节点的延迟明显高于其他节点，继续排查，如果发现某个磁盘的 IO await 明显较高，那基本证明该磁盘是 _慢盘_

# 坏盘黑名单

Pegasus 支持 _磁盘黑名单_，如果要将坏盘下线，首先要把它定义在其所在 Replica Server 的 _黑名单文件_ 中，黑名单文件所在路径根据配置决定：

```ini
[replication]
    data_dirs_black_list_file = /home/work/.pegasus_data_dirs_black_list
```

然后登录对应服务器，编辑该文件，例如标注磁盘 ssd2 和 ssd3 需要禁用：
```txt
/home/work/ssd2
/home/work/ssd3
```

## 重启服务

在标注了坏盘名单后，需要重启使其生效。建议通过 [高可用重启](rolling-update#高可用重启) 对应服务器上的 Replica Server 进程。

重启后，可以在程序日志中能够发现如下记录，表示黑名单内标记的磁盘生效了：

```log
data_dirs_black_list_file[/home/work/.pegasus_data_dirs_black_list] found, apply it
black_list[1] = [/home/work/ssd2/]
black_list[2] = [/home/work/ssd3/]
```
