import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Health {
    @GetMapping("/health")
    public boolean health() {
        return true;
    }

    @PostMapping("/items")
    public java.util.Map<String, Integer> items() {
        return java.util.Map.of("id", 1);
    }
}
