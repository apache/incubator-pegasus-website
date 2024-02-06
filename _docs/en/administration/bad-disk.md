---
permalink: administration/bad-disk
---

# Bad disk troubleshooting

When a disk failure occurs, it can be checked by the following methods:

- In the Replica Server logs, an `IO error` was found for a certain disk
- It is possible that the latency of a certain server is significantly higher than that of other servers. Continuing to investigate, if it is found that the _IO wait_ of a certain disk is significantly higher, it basically proves that the disk is a _slow disk_

# Bad disk blacklist

Pegasus supports _disk black list_, if you want to take a bad disk offline, firstly, define it in the _disk black list_ file on the Replica Server where it is located, the file path is determined by the configuration:

```ini
[replication]
    data_dirs_black_list_file = /home/work/.pegasus_data_dirs_black_list
```

Then log in to the corresponding server and edit the file, for example, disable `ssd2` and `ssd3`:
```txt
/home/work/ssd2
/home/work/ssd3
```

## Restart service

After marking the black list of bad disks, a restart is required to take effect. It is recommended to restart the Replica Server process on the corresponding server through [High availability restart steps](rolling-update#high-availability-restart-steps).

After restarting, the following records can be found in the server log, indicating that the disks marked in the black list have taken effect:

```log
data_dirs_black_list_file[/home/work/.pegasus_data_dirs_black_list] found, apply it
black_list[1] = [/home/work/ssd2/]
black_list[2] = [/home/work/ssd3/]
```
