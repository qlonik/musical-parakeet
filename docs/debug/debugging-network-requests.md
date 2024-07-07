# Debugging network requests

## Nginx Ingress

It is possible to see raw headers of incoming requests, by using lua plugins.
Refer to
[plugin readme](https://github.com/kubernetes/ingress-nginx/tree/main/rootfs/etc/nginx/lua/plugins)
for extra details.

Apply patch similar to the following to add a custom plugin to ingress-nginx:

```diff
diff --git a/kubernetes/apps/networking/ingress-nginx/app/helmrelease.yaml b/kubernetes/apps/networking/ingress-nginx/app/helmrelease.yaml
index e5b0b11..f857d56 100644
--- a/kubernetes/apps/networking/ingress-nginx/app/helmrelease.yaml
+++ b/kubernetes/apps/networking/ingress-nginx/app/helmrelease.yaml
@@ -30,6 +30,14 @@ spec:
       extraEnvs:
         - name: TZ
           value: "${TIMEZONE}"
+      extraVolumes:
+        - name: log-headers-plugin
+          configMap:
+            name: log-headers-plugin
+      extraVolumeMounts:
+        - mountPath: /etc/nginx/lua/plugins/log_headers_plugin/main.lua
+          name: log-headers-plugin
+          subPath: main.lua
       service:
         annotations:
           metallb.universe.tf/loadBalancerIPs: "${METALLB_INGRESS_ADDR}"
@@ -39,6 +47,8 @@ spec:
       ingressClassResource:
         default: true
       config:
+        plugins: log_headers_plugin
+        use-http2: false
         client-header-timeout: 120
         client-body-buffer-size: "100M"
         client-body-timeout: 120
diff --git a/kubernetes/apps/networking/ingress-nginx/app/kustomization.yaml b/kubernetes/apps/networking/ingress-nginx/app/kustomization.yaml
index bbb7ea2..a42f1ec 100644
--- a/kubernetes/apps/networking/ingress-nginx/app/kustomization.yaml
+++ b/kubernetes/apps/networking/ingress-nginx/app/kustomization.yaml
@@ -8,5 +8,8 @@ configMapGenerator:
   - name: cloudflare-networks
     files:
       - ./cloudflare-networks.txt
+  - name: log-headers-plugin
+    files:
+      - ./log-headers-plugin/main.lua
 generatorOptions:
   disableNameSuffixHash: true
diff --git a/kubernetes/apps/networking/ingress-nginx/app/log-headers-plugin/main.lua b/kubernetes/apps/networking/ingress-nginx/app/log-headers-plugin/main.lua
new file mode 100644
index 0000000..c39cddd
--- /dev/null
+++ b/kubernetes/apps/networking/ingress-nginx/app/log-headers-plugin/main.lua
@@ -0,0 +1,8 @@
+local ngx = ngx
+local _M = {}
+
+function _M.rewrite()
+    ngx.log(ngx.ERR, ngx.req.raw_header())
+end
+
+return _M
```
