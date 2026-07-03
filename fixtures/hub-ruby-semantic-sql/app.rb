require "sinatra/json"

get "/item/:id" do
  DB.execute("SELECT id FROM items WHERE id = ?", [params["id"]])
  json ok: true
end

get "/users/:id" do
  DB.query("SELECT name FROM users WHERE id = ?", [params["id"]])
  json ok: true
end
