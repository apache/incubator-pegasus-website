---
permalink: 1.10.0/docs/build/compile-from-source/
version: 1.10.0
---

Pegasus目前只支持Linux平台进行源码编译。编译过程中遇到问题，可以通过[Github Issues]({{ site.pegasus_github_url }}/issues)向我们咨询。

## 环境要求

- GCC 4.9.4+
- CMake 3.11+

## Ubuntu环境配置

你可以参考 [pegasus-build-dev/ubuntu16.04](https://github.com/pegasus-kv/pegasus-docker/blob/{{ page.version }}/pegasus-build-env/ubuntu16.04/Dockerfile) 的Docker镜像安装全部依赖。

## CentOS环境配置

你可以参考 [pegasus-build-dev/centos7](https://github.com/pegasus-kv/pegasus-docker/blob/{{ page.version }}/pegasus-build-env/centos7/Dockerfile) 的Docker镜像安装全部依赖。

## 源码编译

请先参考[下载文档](/_docs/zh/downloads.md)获取源码。

```bash
./run.sh build -c
```

编译后输出会放在当前目录的`DSN_ROOT/`文件夹下，里面包含bin、include、lib目录。

## 编译打包

打包server端程序包，用于服务部署：

```bash
./run.sh pack_server
```

打包client端库，用于C/C++端客户端开发：

```bash
./run.sh pack_client
```

打包tools工具集，里面包含了各种工具（shell、bench）：

```bash
./run.sh pack_tools
```

编译成功后，推荐先[体验onebox集群](/_overview/zh/onebox.md)。
