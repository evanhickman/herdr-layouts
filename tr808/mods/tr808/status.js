import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window } from "herdr";
import { INK, led } from "./panel.js";

// The status bar as the 808's gray step panel: the machine and branch, agent
// counts on LEDs, and the command palette on a boxed label.
export class Status {
  render() {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const list = agents();
    const count = (status) => list.filter((a) => a.status === status).length;
    const label = (icon, text) => h_flex().gap(6).items_center()
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(13).text_color(INK)).child(text);
    const meter = (status, text) => h_flex().gap(5).items_center()
      .child(led(t, count(status) > 0 ? status : "off", 6)).child(`${count(status)} ${text}`);
    return h_flex().size_full().px(14).gap(16).items_center().bg(t.ansi7).border_t(1).border_color("#00000066")
      .text_size(11.5).font_medium().text_color(INK)
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), (el) => el.child(label("branch", space.branch)))
      .child(meter("working", "working"))
      .child(meter("blocked", count("blocked") === 1 ? "needs you" : "need you"))
      .child(meter("done", "done"))
      .child(meter("idle", "idle"))
      .child(div().flex_1())
      .child(div().id("palette").h(18).px(6).flex().items_center().border(1).border_color(INK).rounded(2)
        .text_size(10).font_semibold().cursor_pointer().hover((s) => s.bg("#00000014"))
        .on_click(() => run("app.palette"))
        .child(`${window()?.platform === "macos" ? "⌘" : "CTRL"} SHIFT P  COMMANDS`));
  }
}
