import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class Health {
    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("ok", true);
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        return Map.of("service", "hub-gold-java-structured", "version", 1);
    }
}
