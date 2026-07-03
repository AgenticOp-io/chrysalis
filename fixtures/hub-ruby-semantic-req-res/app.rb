require "sinatra/json"

get "/user/:id" do
  json id: params["id"], q: params.fetch("q", ""), hdr: request.env["HTTP_X_TEST"], cookie: request.cookies["sid"]
end
