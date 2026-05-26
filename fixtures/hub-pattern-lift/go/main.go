package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()
	r.GET("/health", func(c *gin.Context) { c.String(200, "ok") })
	r.POST("/items", func(c *gin.Context) { c.Status(201) })
}
