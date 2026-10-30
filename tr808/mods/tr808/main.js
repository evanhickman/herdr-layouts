// TR-808 touches on Herdr's own layout. One mod, several parts: the layout names
// `tabs`, `brand`, `status` or `footer` in props; pane headers get { pane, terminal }.

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { Tabs } from "./tabs.js";
import { Brand } from "./brand.js";
import { Status } from "./status.js";
import { Footer } from "./footer.js";
import { Pane } from "./pane.js";

const PARTS = { tabs: Tabs, brand: Brand, status: Status, footer: Footer };

export default class TR808 extends View {
  init(_props, cx) {
    const Part = props()?.pane ? Pane : PARTS[props()?.part];
    this.part = Part ? new Part(cx) : null;
  }

  render(cx) {
    return this.part ? this.part.render(cx) : div();
  }
}
