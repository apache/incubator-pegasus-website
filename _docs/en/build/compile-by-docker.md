---
permalink: docs/build/compile-by-docker/
redirect_from:
  - master/docs/build/compile-from-source/
version: master
---

## Download the docker image

Pegasus encapsulates the building environments into [docker images](https://hub.docker.com/r/apache/pegasus/tags?page=1&name=env), you can build directly based on these environments.

For example, you can use the image based on `Ubuntu 20.04`:
```sh
docker pull apache/pegasus:build-env-ubuntu2004
```

## Compilation

Please refer to [Downloads](/docs/downloads) to fetch the sources under a directory (`/your/local/apache-pegasus-source`). Then run the following command:

```sh
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004 \
           /bin/bash -c "cd /root/pegasus; ./run.sh build -c --clear_thirdparty -j $(nproc)"
```

The output of compilation will be placed under `build/latest/output/` of the source directory. It includes `bin`, `include` and `lib`.

## Packaging

Package server binaries for deployment:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004 \
           /bin/bash -c "./run.sh pack_server"
```

Package client libraries for C/C++ development:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004 \
           /bin/bash -c "./run.sh pack_client"
```

Package toolset which includes various tools (shell, bench):

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004 \
           /bin/bash -c "./run.sh pack_tools"
```

If this is your first time compiling Pegasus, it's recommended to try [onebox](/overview/onebox).
