---
permalink: administration/whitelist
---

# Introduction

The Pegasus Replica Server whitelist function is used to prevent unexpected Replica Server joining the cluster. For example:
1. The offline Replica Server was restarted unexpectedly and rejoined the cluster
2. The Meta Server list configured on Replica Server is incorrect, causing it to join to another cluster unexpectedly

When the Replica Server whitelist function is disabled, any Replica Server could join a cluster if configure the corresponding Meta Server list.

When the Replica Server whitelist function is enabled, Meta Server only allows Replica Servers in the Replica Server whitelist to join the cluster.

# How to use the Replica Server whitelist

## Configuration

Configure `[meta_server].enable_white_list` and `[meta_server].replica_white_list`, use `,` to separate multiple servers:
```
[meta_server]
  enable_white_list = true
  replica_white_list = 127.0.0.1:34801,127.0.0.2:34801
```

## Query

After updating the whitelist configuration, it is necessary to restart the Meta Server to take effect, it can be queried through shell tools [Remote commands](remote-commands) or [HTTP API](/api/http).

Taking remote_command as an example:
```
>>> remote_command -t meta-server fd.allow_list
```

# Scale-in and scale-out

When the Replica Server whitelist is enabled, scaling operations need to consider the impact of this feature.

## Scale-out

Because the newly added Replica Server needs to communicate with Meta Server, if the Replica Server whitelist has not been updated, it will cause the Meta Server to reject the new Replica Server from joining the cluster.

So, for the scale-out steps of a cluster with the Replica Server whitelist function enabled, the following steps need to be taken before [Scale out steps](/administration/scale-in-out#scale-out-steps):
1. Add the new Replica Servers to the Replica Server whitelist configuration on the Meta Server
2. Restart Meta Server to take effect

## Scale-in

In [Scale in steps](/administration/scale-in-out#scale-in-steps), whether update the Replica Server whitelist has no impact, the updating can be done at any time after the scaling is completed.

But for safety reasons, it is recommended to update the Replica Server whitelist in a timely manner. Just before the final step (i.e. _Restart the meta server_) of the scaling process, update the Replica Server whitelist configuration of the Meta Server.
