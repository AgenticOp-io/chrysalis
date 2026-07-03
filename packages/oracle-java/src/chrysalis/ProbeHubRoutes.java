package chrysalis;

import com.fasterxml.jackson.databind.ObjectMapper;
import hub.HubRoutes;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/** Reflection probe for emitted Spring @RestController hub routes (no servlet container). */
public final class ProbeHubRoutes {
  private ProbeHubRoutes() {}

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.out.println("{\"ok\":false,\"error\":\"missing-fixture\"}");
      return;
    }
    Path fixture = Path.of(args[0]);
    Path routesPath = fixture.resolve("chrysalis.oracle-probe-routes.json");
    if (!Files.isRegularFile(routesPath)) {
      System.out.println("{\"ok\":false,\"error\":\"missing-probe-routes\"}");
      return;
    }
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = new ObjectMapper().readValue(routesPath.toFile(), Map.class);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> routes = (List<Map<String, Object>>) spec.get("routes");
    if (routes == null) {
      System.out.println("{\"ok\":false,\"error\":\"invalid-probe-routes\"}");
      return;
    }

    HubRoutes hub = new HubRoutes();
    ObjectMapper mapper = new ObjectMapper();
    List<Map<String, Object>> results = new ArrayList<>();
    for (Map<String, Object> route : routes) {
      String method = String.valueOf(route.getOrDefault("method", "GET")).toUpperCase();
      String path = String.valueOf(route.getOrDefault("path", "/"));
      HandlerMatch match = findHandler(hub.getClass(), method, path);
      if (match == null) {
        results.add(Map.of("method", method, "path", path, "error", "handler-not-found"));
        continue;
      }
      Object[] invokeArgs = buildInvokeArgs(match.handler(), match.template(), path);
      Object body = match.handler().invoke(hub, invokeArgs);
      String jsonBody = mapper.writeValueAsString(body);
      results.add(
          Map.of(
              "method",
              method,
              "path",
              path,
              "status",
              200,
              "body",
              jsonBody,
              "headers",
              Map.of("Content-Type", "application/json")));
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("ok", true);
    out.put("results", results);
    out.put("routeCount", results.size());
    System.out.println(mapper.writeValueAsString(out));
  }

  record HandlerMatch(Method handler, String template) {}

  static HandlerMatch findHandler(Class<?> type, String httpMethod, String concretePath) {
    for (Method m : type.getDeclaredMethods()) {
      RequestMapping mapping = m.getAnnotation(RequestMapping.class);
      if (mapping != null) {
        if (!methodMatches(httpMethod, mapping.method())) continue;
        for (String template : mapping.path().length > 0 ? mapping.path() : mapping.value()) {
          if (pathMatches(template, concretePath)) return new HandlerMatch(m, template);
        }
      }
      for (java.lang.annotation.Annotation ann : m.getAnnotations()) {
        RequestMethod rm = annMethod(ann);
        if (rm == null || !rm.name().equals(httpMethod)) continue;
        String pathVal = annPath(ann);
        if (pathVal != null && pathMatches(pathVal, concretePath)) return new HandlerMatch(m, pathVal);
      }
    }
    return null;
  }

  static RequestMethod annMethod(java.lang.annotation.Annotation ann) {
    String n = ann.annotationType().getSimpleName();
    return switch (n) {
      case "GetMapping" -> RequestMethod.GET;
      case "PostMapping" -> RequestMethod.POST;
      case "PutMapping" -> RequestMethod.PUT;
      case "PatchMapping" -> RequestMethod.PATCH;
      case "DeleteMapping" -> RequestMethod.DELETE;
      default -> null;
    };
  }

  static String annPath(java.lang.annotation.Annotation ann) {
    try {
      Object[] paths = (Object[]) ann.annotationType().getMethod("path").invoke(ann);
      if (paths != null && paths.length > 0) return String.valueOf(paths[0]);
      Object[] values = (Object[]) ann.annotationType().getMethod("value").invoke(ann);
      if (values != null && values.length > 0) return String.valueOf(values[0]);
    } catch (ReflectiveOperationException ignored) {
      // fall through
    }
    return null;
  }

  static boolean methodMatches(String httpMethod, RequestMethod[] methods) {
    if (methods == null || methods.length == 0) return true;
    for (RequestMethod rm : methods) {
      if (rm.name().equals(httpMethod)) return true;
    }
    return false;
  }

  static boolean pathMatches(String template, String concrete) {
    String[] t = template.split("/");
    String[] c = concrete.split("/");
    if (t.length != c.length) return false;
    for (int i = 0; i < t.length; i++) {
      if (t[i].isEmpty() && c[i].isEmpty()) continue;
      if (t[i].startsWith("{") && t[i].endsWith("}")) continue;
      if (!t[i].equals(c[i])) return false;
    }
    return true;
  }

  static Object[] buildInvokeArgs(Method handler, String template, String concretePath) {
    Parameter[] params = handler.getParameters();
    Object[] out = new Object[params.length];
    String[] tParts = template.split("/");
    String[] cParts = concretePath.split("/");
    for (int i = 0; i < params.length; i++) {
      Parameter p = params[i];
      if (p.isAnnotationPresent(PathVariable.class)) {
        PathVariable pv = p.getAnnotation(PathVariable.class);
        String name = pv.value().isEmpty() ? p.getName() : pv.value();
        out[i] = segmentForName(name, tParts, cParts);
      } else if (p.getType() == String.class) {
        out[i] = "";
      } else if (p.getType() == int.class || p.getType() == Integer.class) {
        out[i] = 0;
      } else if (p.getType() == boolean.class || p.getType() == Boolean.class) {
        out[i] = false;
      } else {
        out[i] = null;
      }
    }
    return out;
  }

  static String segmentForName(String name, String[] templateParts, String[] concreteParts) {
    for (int i = 0; i < templateParts.length; i++) {
      String part = templateParts[i];
      if (part.equals("{" + name + "}") && i < concreteParts.length) {
        return concreteParts[i];
      }
    }
    return "1";
  }
}
