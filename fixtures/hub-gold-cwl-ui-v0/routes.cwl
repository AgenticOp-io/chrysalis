# CWL UI v0 gold fixture (RFC-0017)
module ui_v0;

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

@page GET "/ui-v0/:name"
page ui_v0_named {
  effects: none;
  param name;
  return ui {
    element "main" {
      element "h1" { text name; }
    }
  };
}
