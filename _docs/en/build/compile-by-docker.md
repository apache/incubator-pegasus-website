---
permalink: docs/build/compile-by-docker/
---

## Download the docker image

Pegasus encapsulates the building environment into a [docker image](https://hub.docker.com/r/apachepegasus/build-env), you can build directly based on this environment.

```sh
docker pull apachepegasus/build-env:centos7
```

To build based on a formally released stable version (e.g {{ site.latest_pegasus_version }}), you can pull as follow:

```sh
docker pull apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7
```

## Compilation

Please refer to [Downloads](/_docs/en/downloads.md) to fetch the sources under a directory (`/your/local/apache-pegasus-source`). Then run the following command:

```sh
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh build -c"
```

The output of compilation will be placed under `DSN_ROOT` of the source directory. It includes `bin`, `include` and `lib`.

## Packaging

Package server binaries for deployment:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_server"
```

Package client libraries for C/C++ development:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_client"
```

Package toolset which includes various tools (shell, bench):

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_tools"
```

If this is your first time compiling Pegasus, it's recommended to try [onebox](/_overview/en/onebox.md).
