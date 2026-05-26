import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class App {
    @GetMapping("/health")
    fun health(): Boolean = true

    @PostMapping("/items")
    fun items(): Map<String, Int> = mapOf("id" to 1)
}
