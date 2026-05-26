from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/ready")
def ready():
    return jsonify(ready=True)


@app.post("/echo")
def echo():
    return jsonify(ok=True)
