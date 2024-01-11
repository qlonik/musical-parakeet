{
  description = "A basic flake with a shell";

  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs/nixpkgs-unstable;
    flake-utils.url = github:numtide/flake-utils;
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let

        pkgs = nixpkgs.legacyPackages.${system};

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            age
            cilium-cli
            cloudflared
            fluxcd
            go-task
            jq
            k9s
            kubectl
            kubernetes-helm
            kustomize
            minio-client
            nodePackages.prettier
            pre-commit
            python3
            python310Packages.pynvim # for using neovim with python3 provided by nix environment
            sops
            stern
            yamllint
            yq-go
          ];

          shellHook = ''
            export LOCALE_ARCHIVE="${pkgs.glibcLocales}/lib/locale/locale-archive"
            pre-commit install --install-hooks
          '';
        };
      });
}
