require "sinatra"

get "/health" do
  true
end

post "/items" do
  { id: 1 }
end
