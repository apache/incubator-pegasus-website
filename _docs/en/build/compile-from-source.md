---
permalink: docs/build/compile-from-source/
redirect_from:
  - master/docs/build/compile-from-source/
version: master
---

Since 2.4.0, Pegasus supports to build both on Linux and macOS. Please don't hesitate to contact us via [Github Issues]({{ site.pegasus_github_url }}/issues) when you encountered any problem.

## Requirements

- GCC 5.4.0+
- CMake 3.11.0+

## Linux environment

You can refer to the docker images to install dependencies and set environment variables. For example:
- [CentOS 7](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/centos7/Dockerfile)
- [Ubuntu 18.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu1804/Dockerfile)
- [Ubuntu 20.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu1804/Dockerfile)
- [Ubuntu 22.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu2204/Dockerfile)

## Compilation

Please refer to [Downloads](/docs/downloads) to fetch the sources。

```bash
./run.sh build -c --clear_thirdparty -j $(nproc)
```

The output of compilation will be placed under `build/latest/output/` of the source directory. It includes `bin`, `include` and `lib`.

## Packaging

Package server binaries for development:

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
