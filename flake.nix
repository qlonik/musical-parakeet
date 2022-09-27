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
            # k8s
            kubectl
            fluxcd
            kubernetes-helm
            kustomize
            stern
            # ansible
            ansible
            ansible-lint
            ipcalc
            # terraform
            terraform
            cf-terraforming
            jq
            yq-go
            # dev tools
            age
            sops
            envsubst
            go-task
            pre-commit
            nodePackages.prettier
            tflint
            yamllint
          ];
        };
      });
}
