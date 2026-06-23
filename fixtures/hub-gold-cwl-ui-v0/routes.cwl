# CWL UI v0 gold fixture (RFC-0017 / RFC-0018 components)
module ui_v0;

@component Card {
  prop title;
  return ui {
    element "div" class "card" {
      element "h2" { text title; }
    }
  };
}

@page GET "/ui-v0"
page ui_v0_demo {
  effects: none;
  return ui {
    element "main" class "demo" {
      element "h1" { text "CWL UI v0"; }
      element "p" { text "Server-rendered element tree."; }
    }
  };
}

@page GET "/ui-v0/card"
page ui_v0_card {
  effects: none;
  return ui Card { title: "Component reuse"; };
}

@page GET "/ui-v0/:name"
page ui_v0_named {
  effects: none;
  param name;
  return ui Card { title: name; };
}
