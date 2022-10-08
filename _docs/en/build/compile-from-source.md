---
permalink: docs/build/compile-from-source/
redirect_from:
  - master/docs/build/compile-from-source/
version: master
---

Since 2.4.0, Pegasus supports to build both on Linux and macOS. Please don't hesitate to contact us via [Github Issues]({{ site.pegasus_github_url }}/issues) when you encountered any problem.

## Requirements

- GCC 5+
- CMake 3.11+

## Ubuntu environment

You can refer to the docker image [pegasus-build-dev/ubuntu20.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu2004/Dockerfile) to install all dependencies.

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

## CentOS environment

You can refer to the docker image [pegasus-build-dev/centos7](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/centos7/Dockerfile) to install all dependencies.

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

## Compilation

Firstly, make sure:
- `maven` has been installed correctly and added to `PATH`
- `devtoolset-7` has been added to `PATH`
- `JAVA_HOME` has been set correctly

Please refer to [Downloads](/docs/downloads) to fetch the sources。

```bash
./run.sh build -c
```

The output of compilation will be placed under `DSN_ROOT` of the source directory. It includes `bin`, `include` and `lib`.

## Packaging

Package server binaries for deployment:

```bash
./run.sh pack_server
```

Package client libraries for C/C++ development:

```bash
./run.sh pack_client
```

Package toolset which includes various tools (shell, bench):

```bash
./run.sh pack_tools
```

If this is your first time compiling Pegasus, it's recommended to try [onebox](/overview/onebox).
