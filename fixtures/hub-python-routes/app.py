from flask import Flask

app = Flask(__name__)


@app.get("/health")
def health():
    return True


@app.post("/items")
def create_item():
    return {"id": 1}
