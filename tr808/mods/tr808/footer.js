import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, run, shared, updates } from "herdr";
import { INK } from "./panel.js";

// The sidebar's footer as the left end of the gray step panel, level with the
// status strip: Settings and Add machine on boxed labels, as in workspace-chrome.
export class Footer {
  key(id, icon, label, collapsed, action) {
    return h_flex().id(id).h(18).px(6).gap(5).flex_none().items_center().rounded(2).border(1).border_color(INK)
      .text_size(10).font_semibold().cursor_pointer().hover((s) => s.bg("#00000014")).on_click(action)
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(11).text_color(INK))
      .when(!collapsed, (el) => el.child(label));
  }

  render() {
    const t = theme();
    const collapsed = shared("sidebar.collapsed") === true;
    // An update waiting: a cream LED, not a status color.
    const ready = Boolean(updates().app.ready);
    return h_flex().size_full().px(collapsed ? 8 : 12).gap(8).items_center().bg(t.ansi7).border_t(1).border_color("#00000066")
      .text_color(INK)
      .child(this.key("settings", "settings", "SETTINGS", collapsed, () => run("app.settings"))
        .when(ready, (el) => el.child(div().size(10).flex_none().flex().items_center().justify_center().rounded_full().bg("#000000")
          .child(div().size(6).rounded_full().bg(t.foreground)))))
      .when(!collapsed, (el) => el.child(this.key("machine", "plus", "ADD MACHINE", collapsed, () => run("mod.open", { name: "machine-add" }))));
  }
}
