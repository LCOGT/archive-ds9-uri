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
    pkgs.icu
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
