from flask import Flask

app = Flask(__name__)


@app.get("/health")
def health():
    return True


@app.get("/ping")
def ping():
    return 42
