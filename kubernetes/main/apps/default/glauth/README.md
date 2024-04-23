# glauth

Some services configure LDAP as runtime configuration via UI, rather than
through config files. So those might not be found via config file search.
Services that are known to use glauth and were configured via web ui:

- `nextcloud`
- `jellyfin`

Services that use glauth via config files:

- `authelia`
