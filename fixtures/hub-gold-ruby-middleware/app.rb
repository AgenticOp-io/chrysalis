require "sinatra"
require "json"

get "/ready" do
  content_type :json
  { ready: true }.to_json
end

post "/echo" do
  content_type :json
  { ok: true }.to_json
end
