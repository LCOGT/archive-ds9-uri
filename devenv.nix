{ pkgs, ... }:
let
  linuxPackages = [
    pkgs.dpkg
    pkgs.fakeroot
    pkgs.rpm
    pkgs.flatpak
    pkgs.flatpak-builder
    pkgs.elfutils
    pkgs.debugedit

    # needed for Windows build on Linux
    pkgs.mono
    pkgs.wineWowPackages.staging
  ];
in {
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.nodejs-19_x
    pkgs.yarn
  ] ++ (if pkgs.stdenv.isLinux then linuxPackages else []);

  enterShell = ''
    ${if pkgs.stdenv.isLinux then ''
      # Wine env vars
      export WINEPREFIX=$DEVENV_ROOT/.wine

      # Disables prompts (I think)
      export WINEDLLOVERRIDES="mscoree,mshtml="

      flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    '' else ""}
  '';

  pre-commit.hooks = {
    lint = {
      enable = true;
      name = "Lint";
      entry = "yarn lint";
      pass_filenames = false;
      raw = {
        verbose = true;
        fail_fast = true;
      };
    };

    fmt = {
      enable = true;
      name = "Format";
      entry = "yarn fmt";
      pass_filenames = false;
      raw = {
        verbose = true;
      };
    };
  };

}
