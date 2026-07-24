import falcon

# hub-gold-falcon — 20-route Falcon dialect (secondary to Flask hub-flagship-python).
# app.add_route + class on_get/on_post/… + {id} paths + req.get_param + resp.media/status
# (D6447 — no invented hooks/middleware/ASGI onion runtime).


class Health:
    def on_get(self, req, resp):
        resp.media = True


class Ping:
    def on_get(self, req, resp):
        resp.media = 42


class Version:
    def on_get(self, req, resp):
        resp.media = 1


class Ready:
    def on_get(self, req, resp):
        resp.text = "ok"


class Count:
    def on_get(self, req, resp):
        resp.media = 3


class Flag:
    def on_get(self, req, resp):
        resp.text = "chrysalis"


class Build:
    def on_get(self, req, resp):
        resp.media = 2026


class Tier:
    def on_get(self, req, resp):
        resp.text = "gold"


class Meta:
    def on_get(self, req, resp):
        resp.media = {"service": "hub-gold-falcon", "version": 1}


class Echo:
    def on_post(self, req, resp):
        resp.media = {"echo": True}


class Items:
    def on_get(self, req, resp):
        resp.media = True

    def on_post(self, req, resp):
        resp.status = falcon.HTTP_201
        resp.media = {"created": True}


class Item:
    def on_get(self, req, resp, id):
        resp.media = {"id": id}

    def on_put(self, req, resp, id):
        resp.media = {"updated": True, "id": id}

    def on_delete(self, req, resp, id):
        resp.media = True

    def on_patch(self, req, resp, id):
        resp.media = {"patched": True, "id": id}


class Search:
    def on_get(self, req, resp):
        resp.media = {"q": req.get_param("q", default="")}


class User:
    def on_get(self, req, resp, userId):
        resp.media = userId


class Stats:
    def on_get(self, req, resp):
        resp.media = 3


class Notify:
    def on_post(self, req, resp):
        resp.status = falcon.HTTP_202
        resp.media = {"ok": True}


app = falcon.App()
app.add_route("/health", Health())
app.add_route("/ping", Ping())
app.add_route("/version", Version())
app.add_route("/ready", Ready())
app.add_route("/count", Count())
app.add_route("/flag", Flag())
app.add_route("/build", Build())
app.add_route("/tier", Tier())
app.add_route("/meta", Meta())
app.add_route("/echo", Echo())
app.add_route("/items", Items())
app.add_route("/items/{id}", Item())
app.add_route("/search", Search())
app.add_route("/users/{userId}", User())
app.add_route("/stats", Stats())
app.add_route("/notify", Notify())
