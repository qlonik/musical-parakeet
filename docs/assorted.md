# Some small assorted tips

## Generate a new secret value

```shell
LENGTH=128
tr -cd '[:alnum:]' < /dev/urandom \
  | fold -w "${LENGTH}"           \
  | head -n 1                     \
  | tr -d '\n'                    \
  | tee >(xargs echo)             \
  | base64 --wrap 0               \
  ; echo
```

The command prints base64 encoded-value, followed by the actual secret value.
