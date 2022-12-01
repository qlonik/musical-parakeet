# GLAuth

## Repo configuration

1. Add/Update `.vscode/settings.json`

   ```json
   {
     "files.associations": {
       "**/cluster/**/*.sops.toml": "plaintext"
       "**/cluster/**/.decrypted~*.sops.toml": "toml",
     }
   }
   ```

2. Add/Update `.gitattributes`

   ```text
   *.sops.toml linguist-language=JSON
   ```

3. Add/Update `.sops.yaml`
   ```yaml
   - path_regex: cluster/.*\.sops\.toml
       key_groups:
       - age:
           - age1w68rvrv30t2xfm42ctr02vurav5222065pl03ys6ps5aklraq42s4jeyjl
   ```

## App Configuration

Below are the decrypted versions of the sops encrypted toml files.

> `passbcrypt` can be generated at https://gchq.github.io/CyberChef/#recipe=Bcrypt(12)To_Hex(%27None%27,0)

1. `server.sops.toml`

   ```toml
   debug = true
   [ldap]
       enabled = true
       listen = "0.0.0.0:389"
   [ldaps]
       enabled = false
   [api]
       enabled = true
       tls = false
       listen = "0.0.0.0:5555"
   [backend]
       datastore = "config"
       baseDN = "dc=home,dc=arpa"
   ```

2. `groups.sops.toml`

   ```toml
   [[groups]]
       name = "svcaccts"
       gidnumber = 6500
   [[groups]]
       name = "admins"
       gidnumber = 6501
   [[groups]]
       name = "people"
       gidnumber = 6502
   ```

3. `users.sops.toml`
   ```toml
   [[users]]
       name = "search"
       uidnumber = 5000
       primarygroup = 6500
       passbcrypt = ""
       [[users.capabilities]]
           action = "search"
           object = "*"
   [[users]]
       name = "user1"
       mail = ""
       givenname = "John"
       sn = "Doe"
       uidnumber = 5001
       primarygroup = 6502
       othergroups = [ 6501 ]
       passbcrypt = ""
   [[users]]
       name = "user2"
       mail = ""
       givenname = "Joanne"
       sn = "Doe"
       uidnumber = 5002
       primarygroup = 6502
       passbcrypt = ""
   ```
