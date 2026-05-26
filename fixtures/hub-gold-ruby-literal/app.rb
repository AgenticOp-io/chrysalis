require "sinatra"

get "/health" do
  true
end

get "/ping" do
  42
end
