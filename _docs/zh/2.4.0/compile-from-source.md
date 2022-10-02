---
permalink: 2.4.0/docs/build/compile-from-source/
redirect_from:
  - 2.4.0/docs/build/compile-from-source/
  - docs/installation
version: 2.4.0
---

从2.4.0开始，Pegasus目前支持Linux和macOS平台进行源码编译。编译过程中遇到问题，可以通过[Github Issues]({{ site.pegasus_github_url }}/issues)向我们咨询。

## 环境要求

- GCC 5+
- CMake 3.11+

## Ubuntu环境配置

你可以参考 [pegasus-build-dev/ubuntu20.04](https://github.com/apache/incubator-pegasus/blob/v2.4/docker/pegasus-build-env/ubuntu2004/Dockerfile) 的Docker镜像安装全部依赖。

```bash
apt-get update -y; \
apt-get install -y --no-install-recommends \
                       build-essential \
                       software-properties-common \
                       clang-10 \
                       openjdk-8-jdk \
                       python3-pip \
                       libaio-dev \
                       libsnappy-dev \
                       libbz2-dev \
                       libzstd-dev \
                       liblz4-dev \
                       zlib1g \
                       zlib1g.dev \
                       patch \
                       netcat \
                       wget \
                       ccache \
                       git \
                       curl \
                       zip \
                       unzip \
                       gdb \
                       vim \
                       automake \
                       libtool \
                       libssl-dev \
                       bison \
                       maven \
                       flex;

pip3 install --no-cache-dir cmake
```

## CentOS环境配置

你可以参考 [pegasus-build-dev/centos7](https://github.com/apache/incubator-pegasus/blob/v2.4/docker/pegasus-build-env/centos7/Dockerfile) 的Docker镜像安装全部依赖。

```bash
yum -y install centos-release-scl \
                   scl-utils \
                   epel-release; \
                   yum -y install devtoolset-7-gcc \
                   devtoolset-7-gcc-c++ \
                   java-1.8.0-openjdk-devel.x86_64 \
                   python3 \
                   automake \
                   autoconf \
                   make \
                   libtool \
                   git \
                   file \
                   wget \
                   ccache \
                   nmap-ncat \
                   zip \
                   gdb \
                   vim \
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

在此之前，请确保：
- `maven`已被正确安装且已添加到`PATH`
- `devtoolset-7`已被添加到`PATH`
- `JAVA_HOME`已被正确设置

请先参考[下载文档](/docs/downloads)获取源码。

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

编译成功后，推荐先[体验onebox集群](/overview/onebox)。
