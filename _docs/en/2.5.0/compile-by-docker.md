---
permalink: 2.5.0/docs/build/compile-by-docker/
redirect_from:
  - 2.5.0/docs/build/compile-by-docker/
version: 2.5.0
---

## Download the docker image

Pegasus encapsulates the building environments into [docker images](https://hub.docker.com/r/apache/pegasus/tags?page=1&name=env), you can build directly based on these environments.

For example, you can use the image based on `Ubuntu 20.04`:
```bash
docker pull apache/pegasus:build-env-ubuntu2004-v2.5
```

## Compilation

Please refer to [Downloads](/docs/downloads) to fetch the sources under a directory (`/your/local/apache-pegasus-source`). Then run the following command:

If you want to run tests, you should build Pegasus by the following command:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "cd /root/pegasus; ./run.sh build --test -c --clear_thirdparty -j $(nproc)"
```

If you want to build Pegasus without runing tests, just execute the following command:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "cd /root/pegasus; ./run.sh build -c --clear_thirdparty -j $(nproc)"
```

The output of compilation will be placed under `build/latest/output/` of the source directory. It includes `bin`, `include` and `lib`.

## Run tests

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "cd /root/pegasus; ./run.sh test"
```

## Packaging

Package server binaries for deployment:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "./run.sh pack_server"
```

Package client libraries for C/C++ development:

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "./run.sh pack_client"
```

Package toolset which includes various tools (shell, bench):

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.5 \
           /bin/bash -c "./run.sh pack_tools"
```

If this is your first time compiling Pegasus, it's recommended to try [onebox](/overview/onebox).
