using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Chrysalis.Oracle.Probe;

public sealed class HubAppFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var hubAppDir = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "HubApp"));
        builder.UseContentRoot(hubAppDir);
    }
}

public static class CsharpHubProbe
{
    public static async Task<int> Main(string[] args)
    {
        var fixture = args.Length > 0 ? args[0] : ".";
        var routesPath = Path.Combine(fixture, "chrysalis.oracle-probe-routes.json");
        if (!File.Exists(routesPath))
        {
            Console.WriteLine("{\"ok\":false,\"error\":\"missing-probe-routes\"}");
            return 1;
        }

        var spec = JsonSerializer.Deserialize<ProbeSpec>(File.ReadAllText(routesPath));
        if (spec?.Routes is null)
        {
            Console.WriteLine("{\"ok\":false,\"error\":\"invalid-probe-routes\"}");
            return 1;
        }

        await using var factory = new HubAppFactory();
        using var client = factory.CreateClient();
        var results = new List<ProbeResult>();

        foreach (var route in spec.Routes)
        {
            var method = string.IsNullOrWhiteSpace(route.Method) ? "GET" : route.Method.ToUpperInvariant();
            var path = ConcretePath(route.Path ?? "/");
            var request = new HttpRequestMessage(new HttpMethod(method), path);
            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(request);
            }
            catch (Exception ex)
            {
                results.Add(new ProbeResult { Method = method, Path = path, Error = ex.Message });
                continue;
            }
            var body = await response.Content.ReadAsStringAsync();
            var headers = response.Headers.ToDictionary(h => h.Key, h => h.Value.FirstOrDefault() ?? "");
            foreach (var h in response.Content.Headers)
            {
                headers[h.Key] = h.Value.FirstOrDefault() ?? "";
            }
            results.Add(new ProbeResult
            {
                Method = method,
                Path = path,
                Status = (int)response.StatusCode,
                Body = body,
                Headers = headers,
            });
        }

        var output = JsonSerializer.Serialize(new
        {
            ok = true,
            results,
            routeCount = results.Count,
        });
        Console.WriteLine(output);
        return 0;
    }

    private static string ConcretePath(string path) =>
        System.Text.RegularExpressions.Regex.Replace(
            System.Text.RegularExpressions.Regex.Replace(
                System.Text.RegularExpressions.Regex.Replace(path, @":([A-Za-z_][A-Za-z0-9_]*)", "1"),
                @"\{([A-Za-z_][A-Za-z0-9_]*)\}", "1"),
            @"<([A-Za-z_][A-Za-z0-9_]*)>", "1");
}

class ProbeSpec
{
    [JsonPropertyName("routes")]
    public List<ProbeRoute>? Routes { get; set; }
}

class ProbeRoute
{
    [JsonPropertyName("method")]
    public string? Method { get; set; }

    [JsonPropertyName("path")]
    public string? Path { get; set; }
}

class ProbeResult
{
    public string Method { get; set; } = "";
    public string Path { get; set; } = "";
    public int Status { get; set; }
    public string Body { get; set; } = "";
    public Dictionary<string, string> Headers { get; set; } = new();
    public string? Error { get; set; }
}
