package main

import "github.com/gin-gonic/gin"

// Minimal named-handler Gin origin for hub-go-routes / G20.
// Bodies are real Gin idioms so go-ast named-func resolution is hole-free (D6442).

func main() {
	r := gin.Default()
	r.GET("/health", health)
	r.POST("/items", createItem)
}

func health(c *gin.Context) {
	c.JSON(200, true)
}

func createItem(c *gin.Context) {
	c.JSON(201, gin.H{"created": true})
}
