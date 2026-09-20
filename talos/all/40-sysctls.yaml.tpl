apiVersion: v1alpha1
kind: SysctlConfig
params:
  fs.inotify.max_user_watches: "1048576" # Watchdog
  fs.inotify.max_user_instances: "8192" # Watchdog
  net.core.rmem_max: "7500000" # Cloudflared | QUIC
  net.core.wmem_max: "7500000" # Cloudflared | QUIC
  net.ipv4.neigh.default.gc_thresh1: "4096" # Prevent ARP cache overflows
  net.ipv4.neigh.default.gc_thresh2: "8192" # Prevent ARP cache overflows
  net.ipv4.neigh.default.gc_thresh3: "16384" # Prevent ARP cache overflows
  net.ipv4.tcp_slow_start_after_idle: "0" # Preserve congestion window after idle
  user.max_user_namespaces: "11255" # User Namespaces
  net.ipv6.conf.all.forwarding: "1" # IPv6 packet forwarding for home-assistant with thread & matter
  net.ipv6.conf.all.accept_ra: "2" # IPv6 router advertisements for home-assistant with thread & matter
  net.ipv6.conf.all.accept_ra_rt_info_max_plen: "64" # IPv6 router advertisements for home-assistant with thread & matter

  # `all` settings do not seem to apply to `bond0` and the underlying interface. repeating explicitly.
  # also see https://github.com/siderolabs/talos/issues/3841, https://github.com/siderolabs/talos/issues/12604
  net.ipv6.conf.bond0.accept_ra: "2"
  net.ipv6.conf.bond0.accept_ra_rt_info_max_plen: "64"
  net.ipv6.conf.{{ .Node.Data.iface }}.accept_ra: "2"
  net.ipv6.conf.{{ .Node.Data.iface }}.accept_ra_rt_info_max_plen: "64"
