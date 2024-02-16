# TrueNAS Scale setup

## Initial setup

1. Install TrueNAS Scale using official iso.

   1. Select the proper drive for root system installation.
   2. For web ui authentication method, select `Administrative user (admin)`
      method and enter secure admin password.

2. Set the hostname to `nova.home.arpa` via UI:

   1. Open UI by ip address.
   2. Go to network tab.
   3. Click on settings in global configuration.
   4. Set hostname to `nova` and domain to `home.arpa`.

3. Setup bridge device via UI:

   1. Open UI by ip address.
   2. Go to network tab.
   3. Click on "add" interface button and set the following:
      - type: bridge
      - name: br0
      - check DHCP
      - bridge members: `eno1`
   4. Go to router, find MAC for the ip address of truenas server and assign it
      in DHCP settings to have IP address `192.168.0.37`.

4. Configure SSH service:

   1. In "Credentials > Local Users", edit admin user from installation step and
      add public ssh key to the list of authorized keys.
   2. In service settings, disable `Allow Password Authentication`, press
      `save`.
   3. Enable the ssh service and set it to start automatically.

5. Reboot the server. Ensure it got proper IP address.

6. Create a new pool or import existing pool from "Storage" tab.

   To create a pool, see
   [creation tutorial](https://www.truenas.com/docs/scale/scaletutorials/storage/createpoolwizard/)
   and
   [creation reference](https://www.truenas.com/docs/scale/scaleuireference/storage/poolcreatewizardscreens/).
   Note, that the pool name cannot be changed after creation. To import a pool,
   see
   [import tutorial](https://www.truenas.com/docs/scale/scaletutorials/storage/importpoolscale/).

   Mixed sizes are not allowed when creating data vdevs. However, it is possible
   to create through cli command using the command below. Note, this command
   will immediately format all of the drives, so pick disks carefully.

   ```bash
    cli -c '\
      storage pool create \
      name=main \
      topology={ "data": [ \
        { "type": "RAIDZ2", "disks": ["sda","sdb","sdc","sdd","sde","sdf"] } \
      ] } \
    '
   ```

   If it is necessary to mount pool at a different path, use
   `zfs set mountpoint=/poolname poolname`.

7. To perform the remainder of configurations, run
   `task ansible:run cluster=storage playbook=storage-prepare`
