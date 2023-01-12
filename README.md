# archive-ds9-uri

Open Archive API frames in DS9

## Install

Pre-built packages are attached to every [Release](https://github.com/LCOGT/archive-electron-ds9-uri/releases/latest).

### macOS

Download the `*.dmg` file and install it.

### Linux

Download the `*.flatpak` file and install it using:

```shell
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak --user install *.flatpak
```

## Develop

Use [devenv](https://devenv.sh/getting-started/) to setup the dev environment:

```shell
devenv shell
```

Run the app in dev mode:

```shell
yarn start
```

Build distribution artifacts (via `electron-forge`):

```shell
yarn make
```

Install application using built `flatpak` (on Linux):

```shell
flatpak --user install out/make/flatpak/x86_64/*.flatpak
```
