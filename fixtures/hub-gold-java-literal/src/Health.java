import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Health {
    @GetMapping("/health")
    public boolean health() {
        return true;
    }

    @GetMapping("/ping")
    public int ping() {
        return 42;
    }
}
