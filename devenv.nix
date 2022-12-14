{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.nodejs-19_x
    pkgs.yarn
    pkgs.dpkg
    pkgs.fakeroot
    pkgs.rpm
    pkgs.flatpak-builder
    pkgs.elfutils
    pkgs.debugedit
  ];

}
