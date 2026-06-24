# CWL UI v1 gold fixture (RFC-0019 — islands + events)
module ui_v1;

@page GET "/ui-v1"
page ui_v1_demo {
  effects: none;
  return ui {
    element "main" class "demo" {
      element "h1" { text "CWL UI v1"; }
      client ui {
        element "button" id "add" {
          text "Add";
          on click { action "increment"; }
        }
      }
    }
  };
}

@page GET "/ui-v1/:name"
page ui_v1_named {
  effects: none;
  param name;
  return ui {
    element "section" {
      element "p" { text name; }
      client ui {
        element "button" {
          text "Go";
          on click { action "navigate"; }
        }
      }
    }
  };
}

@page GET "/ui-v1/load-ui"
page ui_v1_load_ui {
  effects: none;
  load { label: "loaded", source: "v1" };
  return ui {
    element "main" {
      element "p" { text label; }
    }
  };
}
