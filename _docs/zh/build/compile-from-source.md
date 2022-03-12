---
permalink: docs/build/compile-from-source/
redirect_from:
  - 2.1.0/docs/build/compile-from-source/
  - docs/installation
version: 2.1.0
---

Pegasus目前只支持Linux平台进行源码编译。编译过程中遇到问题，可以通过[Github Issues]({{ site.pegasus_github_url }}/issues)向我们咨询。

## 环境要求

- GCC 5+
- CMake 3.11+

## Ubuntu环境配置

你可以参考 [pegasus-build-dev/ubuntu16.04](https://github.com/pegasus-kv/pegasus-docker/blob/2.1.0/pegasus-build-env/ubuntu16.04/Dockerfile) 的Docker镜像安装全部依赖。

```bash
apt-get update -y; \
apt-get -y install build-essential \
                   python3-pip \
                   libaio-dev \
                   libsnappy-dev \
                   libbz2-dev \
                   libzstd-dev \
                   liblz4-dev \
                   zlib1g \
                   zlib1g.dev \
                   patch \
                   git \
                   curl \
                   zip \
                   automake \
                   libtool \
                   libssl-dev \
                   bison \
                   flex;

pip3 install --no-cache-dir cmake
```

## CentOS环境配置

你可以参考 [pegasus-build-dev/centos7](https://github.com/pegasus-kv/pegasus-docker/blob/2.1.0/pegasus-build-env/centos7/Dockerfile) 的Docker镜像安装全部依赖。

```bash
yum -y install centos-release-scl \
               scl-utils \
               epel-release;

yum -y install devtoolset-7-gcc \
               devtoolset-7-gcc-c++ \
               python3 \
               automake \
               autoconf \
               make \
               libtool \
               git \
               file \
               wget \
               unzip \
               which \
               openssl-devel \
               libaio-devel \
               snappy-devel \
               bzip2-devel \
               zlib \
               zlib-devel \
               libzstd-devel \
               lz4-devel \
               bison \
               flex \
               patch;

pip3 install --no-cache-dir cmake
```

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
