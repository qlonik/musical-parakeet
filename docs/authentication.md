# Authentication

A lot of services have authentication enabled and configured. Some of the
services work by login via authelia and http authentication header, some through
oauth to authelia and some connect directly to LDAP server. Authelia is
connected to LDAP as well, so the usernames and passwords are synchronized
between methods of authentication.

The issue becomes when the server has its own authentication method. In those
cases, we tried to setup the admin user and password to match values in
`external-secrets/.../users.sops.yaml`.

Here is the list of services with known authentication methods:

#### Proxy login via Authelia

Some services are hidden behind authentication, but the actual apps do not have
users and do not use `HTTP_REMOTE_USER` header value.

- calibre (no users)
- calibre-web
- data-importer (for firefly-iii, routes based on user header)
- firefly-iii
- grocy
- lazylibrarian (no users)
- lidarr (no users)
- linkding
- paperless
- prowlarr (no users)
- qbittorrent (no users)
- radarr (no users)
- readarr/audio (no users)
- readarr/ebook (no users)
- sabnzbd (no users)
- scrutiny (no users)
- sonarr (no users)
- youtube-dl-server (no users)

#### OAuth by Authelia

1. Configured via config files:

   - autobrr
   - mealie
   - nextcloud

     Note, with https://github.com/pulsejet/nextcloud-oidc-login, login form is
     hidden using `'hide_login_form' => true`, which shows an error message.
     Potentially, if using https://github.com/nextcloud/user_oidc, hiding the
     login form would be more graceful.

   - vikunja

2. Configured via web UI:

   - audiobookshelf
   - immich
   - jellyfin

     Note, jellyfin still shows regular login form, which is linked to LDAP.

#### LDAP server by GLAuth

Some services configure LDAP as runtime configuration via UI, rather than
through config files. So those might not be found via config file search.

1. Configured via config files:

   - authelia
   - mealie
   - thelounge

2. Configured via web UI:
   - calibre-web
   - jellyfin
   - nextcloud
