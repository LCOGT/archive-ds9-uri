# archive-ds9-uri

Open Archive API frames in DS9

## What is this?

[DS9](https://sites.google.com/cfa.harvard.edu/saoimageds9) is de-facto the
tool of choice to view FITS files.

The [LCO Science Archive](https://archive.lco.global) provides a web UI and API
to browse & download FITS files generated by our observatory.

What's missing is a quick & easy way of "linking" images from the Archive
into DS9.

This application provides that functionality.

It does this by registring itself as a handler for `archive+ds9://` URLs with
your Operating System. These links encode which FITS files to download &
open in DS9. Whenever your OS encounters these links it asks this application
to handle them.

## Install

Pre-built packages are attached to every [Release](https://github.com/LCOGT/archive-electron-ds9-uri/releases/latest).

### macOS

Download the `.dmg` file and install it.

You might have to add an exception to get it to open https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac

**NOTE: The DS9 installer for MacOS does not add the ds9 command-line executable to a standard path like /usr/local/bin.
To get around that, please configure the archive-ds9-uri to use the ds9 executable located inside of the application package:**

1. Launch archive-ds9-uri
2. Navigate to the preferences pane
3. Under `Preferences->DS9->Executable`, click the folder to update the location of your DS9 executable. A finder window will open.
4. Type Command+Shift+g, a dialog will open allowing you to specify a path to the ds9 executable. Begin typing `/Applications/SAOImageDS9.app/Contents/MacOS/ds9`. (Note for different versions of DS9 this path may be slightly different)

### Linux

Download the `.flatpak` file and install it using:

```shell
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak --user install *.flatpak
```

### Windows

Download the `Setup.exe` file and install it.

**Note:** If you're having problems launching DS9, try installing the latest
version of DS9 from https://sites.google.com/cfa.harvard.edu/saoimageds9/download.
`8.4.1` is known to work.

## Develop

Use [devenv](https://devenv.sh/getting-started/) to setup the dev environment:

```shell
devenv shell
```

Run the app in dev mode:

```shell
yarn start
```

In development mode any changes to files in `src/renderer/*` automatically propogate out.

Changes to the Main process (`src/main/*`) requires a manual restart of the Node process.
If you type `rs` + `Enter` in the terminal running `yarn start`, it should restart faster
than exiting the process and restarting it manually.

Build distribution artifacts (via `electron-forge`):

```shell
yarn make
```

Install application using built `flatpak` (on Linux):

```shell
flatpak --user install out/make/flatpak/x86_64/*.flatpak
```

### Windows (on Linux via Wine)

To build distribution artifacts for Windows, use:

```shell
yarn make -p win32 -a x64
```
