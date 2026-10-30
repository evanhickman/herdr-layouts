# herdr-layouts

Layouts for [Herdr](https://herdr.dev), the desktop app for terminals and coding agents.

## HR-808

Herdr dressed as a Roland TR-808 drum machine, on the gruvbox palette. Tabs become colored step keys, agent status lights up on LEDs, and a gray strip runs along the bottom like the 808's step panel. Underneath, it's Herdr's own layout, so your workflow stays the same.

![HR-808](hr808/preview.png)

### Install

Ask the agent in your Herdr window:

```
Add herdr.dev/layouts/evanhickman/hr808
```

Or copy the files yourself. First check that you don't already have a layout, theme or mod with these names (`hr808`, `hr808-spaces`, `hr808-agents`); `cp -n` skips any file that exists rather than overwrite it.

```sh
git clone https://github.com/evanhickman/herdr-layouts.git
cd herdr-layouts/hr808
cp -n layouts/hr808.json layouts/hr808.svg ~/.config/herdr-app/layouts/
cp -n themes/hr808.json ~/.config/herdr-app/themes/
cp -Rn mods/hr808 mods/hr808-spaces mods/hr808-agents ~/.config/herdr-app/mods/
herdr-app do layout.switch '{"name":"hr808"}'
```

`cmd-shift-l` (`ctrl-shift-l` on Linux and Windows) steps through your layouts, or pick one by name with `herdr-app do layout.switch`. To uninstall, delete the files you copied.

### What the mods run

`hr808-spaces` runs `git` in each space's folder, `gh pr view` to fetch each branch's pull request (for spaces on this computer), and `hc machine ls`. It also watches each local space's repo folder so branches and change counts stay current. Clicking a PR label runs `open` on the PR's URL. `hr808` and `hr808-agents` run no programs and read no files.

### Requirements

- macOS. The layout uses Futura and Helvetica Neue, and places the macOS window buttons. On other systems the fonts fall back.
- `gh`, signed in, for the PR labels. Without it, the labels don't appear and everything else works. PR labels only appear for spaces on this computer.

### Build it yourself

[hr808/RECIPE.md](hr808/RECIPE.md) describes the layout in enough detail for an agent to rebuild it from an empty folder.

### License

[Apache-2.0](LICENSE). `hr808-spaces` and `hr808-agents` are modified copies of Herdr's own `spaces` and `agents` mods ([herdrdev/herdr-app](https://github.com/herdrdev/herdr-app), Apache-2.0), marked as such at the top of each file.

HR-808 is a fan homage to the Roland TR-808 and isn't affiliated with Roland.
