#!/usr/bin/env ruby
# frozen_string_literal: true

# Probe a generated Sinatra hub app in-process (Rack::Test). Prints JSON to stdout.
require "json"
require "rack/test"

ENV["RACK_ENV"] = "test"

fixture = ARGV[0] || "."
routes_path = File.join(fixture, "chrysalis.oracle-probe-routes.json")
routes_rb = File.join(fixture, "generated", "ruby", "lib", "routes.rb")

unless File.file?(routes_path)
  puts({ ok: false, error: "missing-probe-routes" }.to_json)
  exit 1
end
unless File.file?(routes_rb)
  puts({ ok: false, error: "missing-generated-routes" }.to_json)
  exit 1
end

spec = JSON.parse(File.read(routes_path, encoding: "UTF-8"))
routes = spec["routes"] || []

load File.expand_path(routes_rb)

class HubProbeSession
  include Rack::Test::Methods

  def app
    HubApp
  end
end

def concrete_path(path)
  path.gsub(/:([A-Za-z_][A-Za-z0-9_]*)/, "1")
      .gsub(/\{([A-Za-z_][A-Za-z0-9_]*)\}/, "1")
      .gsub(/<([A-Za-z_][A-Za-z0-9_]*)>/, "1")
end

probe = HubProbeSession.new
results = []
routes.each do |route|
  method = (route["method"] || "GET").upcase
  path = concrete_path(route["path"] || "/")
  response =
    case method
    when "GET" then probe.get(path)
    when "POST" then probe.post(path)
    when "PUT" then probe.put(path)
    when "PATCH" then probe.patch(path)
    when "DELETE" then probe.delete(path)
    else
      results << { method: method, path: path, error: "unsupported-method" }
      next
    end
  results << {
    method: method,
    path: path,
    status: response.status,
    body: response.body,
    headers: response.headers.transform_values { |v| v.is_a?(Array) ? v.first : v.to_s },
  }
end

puts({ ok: true, results: results, routeCount: results.length }.to_json)
