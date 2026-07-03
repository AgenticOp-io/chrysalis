package hub;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ItemController {
  @Autowired
  private JdbcTemplate jdbcTemplate;

  @GetMapping("/item/{id}")
  public Map<String, Object> item(@PathVariable String id) {
    jdbcTemplate.queryForList("SELECT id FROM items WHERE id = ?", id);
    return Map.of("ok", true);
  }

  @GetMapping("/users/{id}")
  public Map<String, Object> users(@PathVariable String id) {
    jdbcTemplate.query("SELECT name FROM users WHERE id = ?", id);
    return Map.of("ok", true);
  }
}
