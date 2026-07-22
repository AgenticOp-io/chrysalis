require "sinatra"
require "json"

get "/health" do
  content_type :json
  { ok: true }.to_json
end

get "/meta" do
  content_type :json
  { service: "hub-gold-ruby-structured", version: 1 }.to_json
end
