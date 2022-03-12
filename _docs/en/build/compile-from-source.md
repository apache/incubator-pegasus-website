---
permalink: docs/build/compile-from-source/
redirect_from:
  - 2.1.0/docs/build/compile-from-source/
version: 2.1.0
---

Pegasus supports Linux only. Please don't hesitate to contact us via [Github Issues]({{ site.pegasus_github_url }}/issues) when you encountered any problem.

## Requirements

- GCC 5+
- CMake 3.11+

## Ubuntu environment

You can refer to the docker image [pegasus-build-dev/ubuntu16.04](https://github.com/pegasus-kv/pegasus-docker/blob/2.1.0/pegasus-build-env/ubuntu16.04/Dockerfile) to install all dependencies.

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

## CentOS environment

You can refer to the docker image [pegasus-build-dev/centos7](https://github.com/pegasus-kv/pegasus-docker/blob/2.1.0/pegasus-build-env/centos7/Dockerfile) to install all dependencies.

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

## Compilation

Please refer to [Downloads](/_docs/en/downloads.md) to fetch the sources。

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

If this is your first time compiling Pegasus, it's recommended to try [onebox](/_overview/en/onebox.md).
