---
title: 白名单
layout: page
menubar: administration_menu
---

## 介绍

Pegasus的白名单功能用来防止非预期的replica server加入集群。

白名单功能禁用时，任何replica server只需要配置meta server地址，就可以被加入该集群。

白名单功能开启时，meta server只允许白名单中的replica server加入集群。


## 怎样开启白名单

### 配置

配置 [meta_server].enable_white_list 与 [meta_server].replica_white_list，多个ip用','分隔：
```
[meta_server]
  enable_white_list = true
  replica_white_list = 127.0.0.1:34801,127.0.0.2:34801
```

### 查询

白名单在meta server运行过程中不允许更改，只能通过修改配置并重启来修改。但是可以通过shell的remote_command来查询。

示例：
```
>>> remote_command -t meta-server meta.fd.allow_list
```
