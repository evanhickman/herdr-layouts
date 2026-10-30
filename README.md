# herdr-layouts

Layouts for [Herdr](https://herdr.dev), the desktop app for terminals and coding agents.

## TR-808

Herdr dressed as a Roland TR-808 drum machine, on the gruvbox palette. Tabs become colored step keys, agent status lights up on LEDs, and a gray strip runs along the bottom like the 808's step panel. Underneath, it's Herdr's own layout, so your workflow stays the same.

![TR-808](tr808/preview.png)

### Install

Ask the agent in your Herdr window:

```
Add herdr.dev/layouts/evanhickman/tr808
```

Or copy the files yourself:

```sh
git clone https://github.com/evanhickman/herdr-layouts.git
cd herdr-layouts/tr808
cp layouts/tr808.json layouts/tr808.svg ~/.config/herdr-app/layouts/
cp themes/tr808.json ~/.config/herdr-app/themes/
cp -R mods/tr808 mods/tr808-spaces mods/tr808-agents ~/.config/herdr-app/mods/
herdr-app do layout.switch '{"name":"tr808"}'
```

`cmd-shift-l` (`ctrl-shift-l` on Linux and Windows) cycles back to your previous layout. To uninstall, delete the files you copied.

### What the mods run

`tr808-spaces` runs `git` in each space's folder, `gh pr view` to fetch each branch's pull request, and `hc machine ls`. Clicking a PR label runs `open` on the PR's URL. `tr808` and `tr808-agents` run no programs.

### Requirements

- macOS. The layout uses Futura and Helvetica Neue, and places the macOS window buttons. On other systems the fonts fall back.
- `gh`, signed in, for the PR labels. Without it, the labels don't appear and everything else works.

### Build it yourself

[tr808/RECIPE.md](tr808/RECIPE.md) describes the layout in enough detail for an agent to rebuild it from an empty folder.

TR-808 is a fan homage and isn't affiliated with Roland.
