package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()
	r.GET("/health", health)
	r.POST("/items", createItem)
}

func health(c *gin.Context) {
	return
}

func createItem(c *gin.Context) {
	return
}
