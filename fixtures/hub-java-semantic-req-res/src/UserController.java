package hub;

import java.util.Map;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
  @GetMapping("/user/{id}")
  public Map<String, Object> user(
      @PathVariable String id,
      @RequestParam(name = "q", defaultValue = "") String q,
      @RequestHeader("X-Test") String hdr,
      @CookieValue("sid") String sid) {
    return Map.of("id", id, "q", q, "hdr", hdr, "cookie", sid);
  }
}
