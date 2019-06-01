---
title: TTL
layout: page
show_sidebar: false
menubar: advanced_usage_menu
---

目录：
* [原理](#原理)
* [接口](#接口)
* [表级TTL](#表级TTL)
* [通过TTL计算数据写入时间](#通过TTL计算数据写入时间)

# 原理
待补充

# 接口
待补充

# 表级TTL
待补充

# 通过TTL计算数据写入时间
如果数据写入时设置了TTL，就可以通过TTL计算出数据写入时间。依据的公式是：
```
TTLExpireTime = InsertTime + TTLSeconds = now + TTLRemainingSeconds

  ==>

InsertTime = now + TTLRemainingSeconds - TTLSeconds
```
其中：
* TTLRemainingSeconds：通过[Shell的ttl命令](Shell%E5%B7%A5%E5%85%B7#%E6%95%B0%E6%8D%AE%E6%93%8D%E4%BD%9C)获取。
* now：执行Shell ttl命令的时间。
* TTLSeconds：用户知道数据写入时设置的TTL。
