"""Extract Flask/Quart/Sanic/FastAPI/Starlette/Litestar/Falcon/Bottle/aiohttp/Tornado-style route metadata from Python source (hub ingest).

Quart is the Flask-async twin: reuse Flask @app.get|post|route / <id> / request.args /
status-tuple peels (AsyncFunctionDef already covered). No middleware/websocket invent.
Same-file Flask Blueprint + @bp.route/@bp.get + literal url_prefix join (G10070) — cross-file = hole.

Sanic: @app.get|post|route, <id> / <id:str> paths, request.args.get, json()/text() (+ status=).
No middleware/Blueprint/listener invent.

Bottle: bare @get|post|route, method='POST', <id> paths, request.query.q / request.params,
HTTPResponse(body, status=N). No plugin/middleware invent.

aiohttp: web.Application() + web.get|post|…('/path', handler), {id} / {id:\\d+} paths,
request.match_info['id'], request.query.get, web.json_response / web.Response.
No middleware/subapp/websocket invent.

Tornado: tornado.web.Application([(r"/path", Handler), …]) + class get/post/…,
(?P<id>[^/]+) / simple ([^/]+) groups, self.get_argument, self.write / self.set_status.
No RequestHandler mixins / UIModule / async gen invent.
"""
import ast
import json
import re
import sys

source = sys.stdin.read()
try:
    tree = ast.parse(source)
except SyntaxError as e:
    print(json.dumps({"error": str(e), "routes": []}))
    sys.exit(0)

RECEIVERS = {"app", "router", "api", "bp", "blueprint"}
HTTP_NAMES = {"get", "post", "put", "patch", "delete", "head", "options", "route"}
# Flask converters + Sanic typed params (<id:str>) share these tokens.
PATH_TYPE_TOKENS = frozenset({
    "int", "float", "path", "string", "str", "uuid", "any", "alpha", "slug",
})
FALCON_ON = {
    "on_get": "GET",
    "on_post": "POST",
    "on_put": "PUT",
    "on_patch": "PATCH",
    "on_delete": "DELETE",
    "on_head": "HEAD",
    "on_options": "OPTIONS",
}
FALCON_STATUS_NAMES = {
    "HTTP_OK": 200,
    "HTTP_CREATED": 201,
    "HTTP_ACCEPTED": 202,
    "HTTP_NO_CONTENT": 204,
}
TORNADO_HTTP = {
    "get": "GET",
    "post": "POST",
    "put": "PUT",
    "patch": "PATCH",
    "delete": "DELETE",
    "head": "HEAD",
    "options": "OPTIONS",
}


def const_str(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    return None


def const_val(node):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    if isinstance(node, ast.Num):
        return node.n
    if isinstance(node, ast.NameConstant):
        return node.value
    return None


def path_param_names(path):
    """Flask `<id>` / `<int:id>`, Sanic `<id>` / `<id:str>`, FastAPI/aiohttp `{id}` / `{id:\\d+}` → bare names."""
    names = []
    for raw in re.findall(r"<([^>]+)>", path):
        raw = raw.strip()
        if ":" not in raw:
            names.append(raw)
            continue
        left, right = raw.split(":", 1)
        left, right = left.strip(), right.strip()
        left_type = left.lower() in PATH_TYPE_TOKENS
        right_type = right.lower() in PATH_TYPE_TOKENS
        if left_type and not right_type:
            names.append(right)  # Flask <int:id>
        elif right_type and not left_type:
            names.append(left)  # Sanic <id:str>
        else:
            names.append(right)  # historical Flask default
    for raw in re.findall(r"\{([^{}]+)\}", path):
        # FastAPI/Starlette {id:int} / aiohttp {id:\d+} — name is always left of ':'.
        names.append(raw.split(":", 1)[0].strip())
    return names


def peel_status_tuple(node):
    """Flask `(body, status)` / `(jsonify(...), 201)` → (payload_node, status_int)."""
    if not isinstance(node, ast.Tuple) or len(node.elts) != 2:
        return None, None
    status = const_val(node.elts[1])
    if not isinstance(status, int):
        return None, None
    return node.elts[0], status


def status_from_keywords(kw):
    """FastAPI `@app.post(..., status_code=201)` → status int."""
    for k in kw:
        if k.arg == "status_code":
            status = const_val(k.value)
            if isinstance(status, int):
                return status
    return None


def request_bucket_map(bucket):
    return {
        "args": "query",
        "query": "query",  # Bottle request.query / FormsDict / aiohttp request.query
        "query_params": "query",
        "params": "query",  # Bottle request.params (query+forms)
        "view_args": "path",
        "path_params": "path",
        "match_info": "path",  # aiohttp request.match_info['id']
        "headers": "header",
        "cookies": "cookie",
    }.get(bucket)


def request_receiver_ok(name):
    return name in ("request", "req")


def request_ref_default(node):
    if len(node.args) >= 2:
        default = const_val(node.args[1])
        if default is not None:
            return default
    for k in node.keywords:
        if k.arg in ("default", "default_val"):
            default = const_val(k.value)
            if default is not None:
                return default
    return None


def request_ref_from_get_call(node):
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "get":
        return None
    inner = node.func.value
    if not isinstance(inner, ast.Attribute):
        return None
    if not isinstance(inner.value, ast.Name) or not request_receiver_ok(inner.value.id):
        return None
    source = request_bucket_map(inner.attr)
    if not source:
        if inner.attr == "json":
            source = "body"
        else:
            return None
    if not node.args:
        return None
    name = const_str(node.args[0])
    if not name:
        return None
    ref = {"t": "ref", "source": source, "name": name}
    default = request_ref_default(node)
    if default is not None:
        ref["default"] = default
    return ref


def request_ref_from_get_param(node):
    """Falcon `req.get_param('q')` / `req.get_param('q', default='')` → query ref."""
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "get_param":
        return None
    if not isinstance(node.func.value, ast.Name) or not request_receiver_ok(node.func.value.id):
        return None
    if not node.args:
        return None
    name = const_str(node.args[0])
    if not name:
        return None
    ref = {"t": "ref", "source": "query", "name": name}
    default = request_ref_default(node)
    if default is not None:
        ref["default"] = default
    return ref


def request_ref_from_get_argument(node):
    """Tornado `self.get_argument('q')` / `self.get_argument('q', '')` → query ref."""
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "get_argument":
        return None
    if not isinstance(node.func.value, ast.Name) or node.func.value.id != "self":
        return None
    if not node.args:
        return None
    name = const_str(node.args[0])
    if not name:
        return None
    ref = {"t": "ref", "source": "query", "name": name}
    default = request_ref_default(node)
    if default is not None:
        ref["default"] = default
    return ref


def request_ref_from_subscript(node):
    if not isinstance(node, ast.Subscript):
        return None
    if not isinstance(node.value, ast.Attribute):
        return None
    inner = node.value
    if not isinstance(inner.value, ast.Name) or not request_receiver_ok(inner.value.id):
        return None
    source = request_bucket_map(inner.attr)
    if not source:
        return None
    key = None
    if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
        key = node.slice.value
    elif isinstance(node.slice, ast.Index) and isinstance(node.slice.value, ast.Constant):
        key = node.slice.value.value if isinstance(node.slice.value.value, str) else None
    if not key:
        return None
    return {"t": "ref", "source": source, "name": key}


def request_ref_from_attr(node):
    """Bottle `request.query.q` / `request.params.q` → query ref."""
    if not isinstance(node, ast.Attribute):
        return None
    if not isinstance(node.value, ast.Attribute):
        return None
    inner = node.value
    if not isinstance(inner.value, ast.Name) or not request_receiver_ok(inner.value.id):
        return None
    source = request_bucket_map(inner.attr)
    if not source:
        return None
    name = node.attr
    if not name or name.startswith("_"):
        return None
    return {"t": "ref", "source": source, "name": name}


def peel_http_response(node):
    """Bottle `HTTPResponse(body, status=N)` / `HTTPResponse(status=N, body=…)` → (payload, status)."""
    if not isinstance(node, ast.Call):
        return None, None
    if not isinstance(node.func, ast.Name) or node.func.id != "HTTPResponse":
        return None, None
    payload = None
    status = None
    if node.args:
        payload = node.args[0]
    for k in node.keywords:
        if k.arg == "body":
            payload = k.value
        elif k.arg == "status":
            s = const_val(k.value)
            if isinstance(s, int):
                status = s
    return payload, status


def peel_json_text_response(node):
    """Sanic `json(body, status=N)` / `text(body, status=N)` → (payload, status)."""
    if not isinstance(node, ast.Call):
        return None, None
    if not isinstance(node.func, ast.Name) or node.func.id not in ("json", "text"):
        return None, None
    payload = node.args[0] if node.args else None
    status = None
    for k in node.keywords:
        if k.arg == "body":
            payload = k.value
        elif k.arg == "status":
            s = const_val(k.value)
            if isinstance(s, int):
                status = s
    return payload, status


def peel_aiohttp_response(node):
    """aiohttp `web.json_response(body, status=N)` / `web.Response(text=…, status=N)` → (payload, status)."""
    if not isinstance(node, ast.Call):
        return None, None
    if not isinstance(node.func, ast.Attribute):
        return None, None
    if not isinstance(node.func.value, ast.Name) or node.func.value.id != "web":
        return None, None
    attr = node.func.attr
    if attr not in ("json_response", "Response"):
        return None, None
    payload = None
    status = None
    if attr == "json_response":
        if node.args:
            payload = node.args[0]
        for k in node.keywords:
            if k.arg in ("data", "text", "body"):
                payload = k.value
            elif k.arg == "status":
                s = const_val(k.value)
                if isinstance(s, int):
                    status = s
    else:
        for k in node.keywords:
            if k.arg in ("text", "body"):
                payload = k.value
            elif k.arg == "status":
                s = const_val(k.value)
                if isinstance(s, int):
                    status = s
        if payload is None and node.args:
            payload = node.args[0]
    return payload, status


AIOHTTP_HTTP = frozenset({"get", "post", "put", "patch", "delete", "head", "options"})


def fill_handler_return(row, body, func_args, path_params):
    """Shared return / status / SQL peels for decorator + named-handler dialects."""
    sql_effects = collect_sql_effects(body, func_args, path_params)
    if sql_effects:
        row["sqlEffects"] = sql_effects
    if not body:
        return
    last = body[-1]
    if not isinstance(last, ast.Return) or last.value is None:
        return
    ret = last.value
    payload, status_code = peel_status_tuple(ret)
    if payload is not None:
        ret = payload
        row["statusCode"] = status_code
    hr_payload, hr_status = peel_http_response(ret)
    if hr_payload is not None or hr_status is not None:
        if hr_payload is not None:
            ret = hr_payload
        if hr_status is not None:
            row["statusCode"] = hr_status
    jt_payload, jt_status = peel_json_text_response(ret)
    if jt_payload is not None or jt_status is not None:
        if jt_payload is not None:
            ret = jt_payload
        if jt_status is not None:
            row["statusCode"] = jt_status
    aio_payload, aio_status = peel_aiohttp_response(ret)
    if aio_payload is not None or aio_status is not None:
        if aio_payload is not None:
            ret = aio_payload
        if aio_status is not None:
            row["statusCode"] = aio_status
    fill_return_fields(row, ret, func_args, path_params)


def expr_tree(node, func_args, path_params):
    if node is None:
        return None
    if isinstance(node, ast.Constant):
        return {"t": "lit", "v": node.value}
    if isinstance(node, ast.Str):
        return {"t": "lit", "v": node.s}
    if isinstance(node, ast.Num):
        return {"t": "lit", "v": node.n}
    if isinstance(node, ast.NameConstant):
        return {"t": "lit", "v": node.value}
    if isinstance(node, ast.Name):
        if node.id in path_params or node.id in func_args:
            return {"t": "ref", "source": "path", "name": node.id}
        return None
    if isinstance(node, ast.Dict):
        entries = []
        for k, v in zip(node.keys, node.values):
            if k is None:
                return None
            key = const_str(k)
            if key is None and isinstance(k, ast.Constant) and isinstance(k.value, str):
                key = k.value
            if key is None:
                return None
            val = expr_tree(v, func_args, path_params)
            if val is None:
                return None
            entries.append({"key": key, "value": val})
        return {"t": "obj", "entries": entries} if entries else None
    if isinstance(node, ast.Call):
        ref = request_ref_from_get_call(node)
        if ref:
            return ref
        ref = request_ref_from_get_param(node)
        if ref:
            return ref
        ref = request_ref_from_get_argument(node)
        if ref:
            return ref
        if isinstance(node.func, ast.Name) and node.func.id in ("jsonify", "json", "text"):
            # jsonify kwargs → object; Sanic json/text unwrap body arg (status peeled elsewhere).
            if node.args and len(node.args) >= 1:
                return expr_tree(node.args[0], func_args, path_params)
            if node.func.id == "jsonify":
                out = {"t": "obj", "entries": []}
                for kw in node.keywords:
                    if kw.arg is None:
                        return None
                    val = expr_tree(kw.value, func_args, path_params)
                    if val is None:
                        return None
                    out["entries"].append({"key": kw.arg, "value": val})
                return out if out["entries"] else None
            for kw in node.keywords:
                if kw.arg == "body":
                    return expr_tree(kw.value, func_args, path_params)
            return None
    if isinstance(node, ast.Attribute):
        ref = request_ref_from_attr(node)
        if ref:
            return ref
    if isinstance(node, ast.Subscript):
        ref = request_ref_from_subscript(node)
        if ref:
            return ref
    return None


def jsonify_payload(node):
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Name) or node.func.id != "jsonify":
        return None
    if node.args and len(node.args) == 1:
        if isinstance(node.args[0], ast.Dict):
            return const_dict(node.args[0])
        v = const_val(node.args[0])
        return {"": v} if v is not None else None
    out = {}
    for kw in node.keywords:
        if kw.arg is None:
            return None
        val = const_val(kw.value)
        if val is None:
            return None
        out[kw.arg] = val
    return out if out else None


def const_dict(node):
    if not isinstance(node, ast.Dict):
        return None
    out = {}
    for k, v in zip(node.keys, node.values):
        if k is None:
            return None
        key = const_str(k) if not isinstance(k, ast.Constant) else (
            k.value if isinstance(k.value, str) else None
        )
        if key is None and isinstance(k, ast.Constant) and isinstance(k.value, str):
            key = k.value
        if key is None:
            return None
        val = const_val(v)
        if val is None:
            return None
        out[key] = val
    return out


def methods_from_keywords(kw):
    """Flask/Starlette `methods=[…]` and Bottle `method='POST'` / `method=['GET','POST']`."""
    for k in kw:
        if k.arg not in ("methods", "method"):
            continue
        if isinstance(k.value, (ast.List, ast.Tuple)):
            out = []
            for elt in k.value.elts:
                s = const_str(elt)
                if s:
                    out.append(s.upper())
            return out if out else None
        s = const_str(k.value)
        if s:
            return [s.upper()]
    return None


def path_from_call(dec):
    """Positional path arg or `path=` keyword (Litestar / FastAPI)."""
    if dec.args:
        path = const_str(dec.args[0])
        if path:
            return path
    for k in dec.keywords:
        if k.arg == "path":
            path = const_str(k.value)
            if path:
                return path
    return None


def route_rows(http_name, path, keywords, line):
    if http_name == "route":
        methods = methods_from_keywords(keywords) or ["GET"]
    else:
        methods = [http_name.upper()]
    status_code = status_from_keywords(keywords)
    rows = [{"method": m, "path": path, "line": line} for m in methods]
    if status_code is not None:
        for row in rows:
            row["statusCode"] = status_code
    return rows


def is_blueprint_call(node):
    """Blueprint(...) / flask.Blueprint(...) constructor call."""
    if not isinstance(node, ast.Call):
        return False
    f = node.func
    if isinstance(f, ast.Name) and f.id == "Blueprint":
        return True
    if isinstance(f, ast.Attribute) and f.attr == "Blueprint":
        return True
    return False


def blueprint_url_prefix(call):
    """Literal url_prefix= from Blueprint(...) — None when non-literal (no invent)."""
    for k in call.keywords:
        if k.arg != "url_prefix":
            continue
        p = const_str(k.value)
        return p  # None when non-literal
    return ""


def join_url_prefix(prefix, path):
    """Join Blueprint url_prefix + route path (Flask-style slash normalize)."""
    if not prefix:
        return path
    if not path:
        return prefix
    if prefix.endswith("/") and path.startswith("/"):
        return prefix[:-1] + path
    if not prefix.endswith("/") and not path.startswith("/"):
        return prefix + "/" + path
    return prefix + path


def collect_blueprint_prefixes(tree):
    """Same-file `bp = Blueprint('name', …, url_prefix='/x')` → {bp: '/x'|''|None}."""
    out = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name) or not is_blueprint_call(node.value):
            continue
        out[target.id] = blueprint_url_prefix(node.value)
    return out


def route_from_decorator(dec, blueprint_prefixes=None):
    if not isinstance(dec, ast.Call):
        return None
    func = dec.func
    line = dec.lineno if hasattr(dec, "lineno") else 1
    path = path_from_call(dec)
    if not path:
        return None
    blueprint_prefixes = blueprint_prefixes or {}
    # Litestar/Bottle: @get("/path") / @route(..., method='POST') / @post(..., status_code=201).
    if isinstance(func, ast.Name) and func.id in HTTP_NAMES:
        return route_rows(func.id, path, dec.keywords, line)
    # Flask/Quart/FastAPI/Starlette: @app.get / @app.route / @router.post / @bp.get
    if not isinstance(func, ast.Attribute):
        return None
    if func.attr not in HTTP_NAMES:
        return None
    recv = func.value
    if not isinstance(recv, ast.Name):
        return None
    if recv.id in blueprint_prefixes:
        prefix = blueprint_prefixes[recv.id]
        if prefix:  # truthy literal; None/"" → path as written (no invent)
            path = join_url_prefix(prefix, path)
    elif recv.id not in RECEIVERS:
        return None
    return route_rows(func.attr, path, dec.keywords, line)


def peel_sql_execute(node, func_args, path_params):
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "execute":
        return None
    if not node.args:
        return None
    sql = const_str(node.args[0])
    if not sql:
        return None
    params = []
    if len(node.args) >= 2:
        bind = node.args[1]
        if isinstance(bind, ast.Tuple):
            for elt in bind.elts:
                p = expr_tree(elt, func_args, path_params)
                if p is not None:
                    params.append(p)
        else:
            p = expr_tree(bind, func_args, path_params)
            if p is not None:
                params.append(p)
    return {"sql": sql, "params": params}


def collect_sql_effects(body, func_args, path_params):
    effects = []
    if not isinstance(body, list):
        return effects
    for stmt in body:
        call = None
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            call = stmt.value
        elif isinstance(stmt, ast.Assign) and isinstance(stmt.value, ast.Call):
            call = stmt.value
        elif isinstance(stmt, ast.AugAssign):
            continue
        if call is not None:
            eff = peel_sql_execute(call, func_args, path_params)
            if eff:
                effects.append(eff)
    return effects


def falcon_status_code(node):
    """falcon.HTTP_201 / falcon.HTTP_CREATED / int / '201 Created' → status int."""
    v = const_val(node)
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        m = re.match(r"^(\d{3})\b", v.strip())
        if m:
            return int(m.group(1))
    if isinstance(node, ast.Attribute):
        name = node.attr
        if name in FALCON_STATUS_NAMES:
            return FALCON_STATUS_NAMES[name]
        m = re.match(r"^HTTP_(\d{3})$", name)
        if m:
            return int(m.group(1))
    return None


def is_resp_attr(target, attr):
    return (
        isinstance(target, ast.Attribute)
        and isinstance(target.value, ast.Name)
        and target.value.id == "resp"
        and target.attr == attr
    )


def peel_falcon_method_body(body):
    """resp.media / resp.text payload + optional resp.status."""
    media = None
    text = None
    status = None
    if not isinstance(body, list):
        return None, None
    for stmt in body:
        if not isinstance(stmt, ast.Assign) or len(stmt.targets) != 1:
            continue
        target = stmt.targets[0]
        if is_resp_attr(target, "media"):
            media = stmt.value
        elif is_resp_attr(target, "text"):
            text = stmt.value
        elif is_resp_attr(target, "status"):
            status = falcon_status_code(stmt.value)
    payload = media if media is not None else text
    return payload, status


def falcon_resource_handlers(class_node):
    handlers = {}
    for item in class_node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name in FALCON_ON:
            handlers[FALCON_ON[item.name]] = item
    return handlers


def falcon_add_route_class(node):
    """Resource() call or bare Resource name → class id."""
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node, ast.Name):
        return node.id
    return None


def is_tornado_application_call(node):
    """tornado.web.Application([...]) / web.Application([...]) / Application([...])."""
    if not isinstance(node, ast.Call):
        return False
    f = node.func
    if isinstance(f, ast.Name) and f.id == "Application":
        return True
    if isinstance(f, ast.Attribute) and f.attr == "Application":
        return True
    return False


def tornado_resource_handlers(class_node):
    """Class get/post/… methods (RequestHandler verbs) → HTTP method map."""
    handlers = {}
    for item in class_node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name in TORNADO_HTTP:
            handlers[TORNADO_HTTP[item.name]] = item
    return handlers


def tornado_handler_class_name(node):
    """Bare Handler name (Application table entry) → class id."""
    if isinstance(node, ast.Name):
        return node.id
    return None


def tornado_path_to_template(path, positional_names):
    """Tornado regex path → `{name}` template (named groups + simple ([^/]+))."""
    if not isinstance(path, str):
        return None
    names = list(positional_names) if positional_names else []
    idx = [0]

    def repl_named(m):
        return "{" + m.group(1) + "}"

    def repl_simple(m):
        if idx[0] >= len(names):
            return m.group(0)
        name = names[idx[0]]
        idx[0] += 1
        return "{" + name + "}"

    out = re.sub(r"\(\?P<([A-Za-z_][\w]*)>[^)]*\)", repl_named, path)
    # Cheap segment captures only — complex nested regex stays unconverted (honest hole).
    out = re.sub(r"\(\[\^/\][+*]\)", repl_simple, out)
    if "(" in out or ")" in out or "?" in out or "+" in out or "*" in out or "[" in out:
        return None
    return out


def is_self_attr_call(node, attr):
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "self"
        and node.func.attr == attr
    )


def peel_tornado_method_body(body):
    """self.write(payload) + optional self.set_status(N)."""
    payload = None
    status = None
    if not isinstance(body, list):
        return None, None
    for stmt in body:
        call = None
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            call = stmt.value
        elif isinstance(stmt, ast.Assign) and isinstance(stmt.value, ast.Call):
            call = stmt.value
        if call is None:
            continue
        if is_self_attr_call(call, "write") and call.args:
            payload = call.args[0]
        elif is_self_attr_call(call, "set_status") and call.args:
            s = const_val(call.args[0])
            if isinstance(s, int):
                status = s
    return payload, status


def fill_return_fields(row, ret, func_args, path_params):
    tree_val = expr_tree(ret, func_args, path_params)
    if tree_val is not None:
        row["returnTree"] = tree_val
        row["returnKind"] = "tree"
        return
    if isinstance(ret, ast.Call) and isinstance(ret.func, ast.Name) and ret.func.id == "jsonify":
        d = jsonify_payload(ret)
        if d is not None:
            row["returnKind"] = "json"
            row["returnValue"] = d
        else:
            row["returnKind"] = "jsonify"
        return
    v = const_val(ret)
    d = const_dict(ret) if isinstance(ret, ast.Dict) else None
    if d is not None:
        row["returnKind"] = "literal"
        row["returnValue"] = d
    elif v is not None and not isinstance(v, dict):
        row["returnKind"] = "literal"
        row["returnValue"] = v
    elif isinstance(ret, ast.Dict):
        row["returnKind"] = "dict"
    else:
        row["returnKind"] = type(ret).__name__


blueprint_prefixes = collect_blueprint_prefixes(tree)

routes = []
for node in tree.body:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        continue
    func_args = [a.arg for a in node.args.args]
    for dec in node.decorator_list:
        found = route_from_decorator(dec, blueprint_prefixes)
        if found:
            for r in found:
                path_params = set(path_param_names(r["path"]))
                row = {
                    "method": r["method"],
                    "path": r["path"],
                    "line": r["line"],
                    "name": node.name,
                    "returns": type(node.body[-1]).__name__ if node.body else None,
                    "returnKind": None,
                }
                if "statusCode" in r:
                    row["statusCode"] = r["statusCode"]
                fill_handler_return(row, node.body, func_args, path_params)
                routes.append(row)
            break

# Falcon: app.add_route('/path', Resource()) + class on_get/on_post/… (same-file only).
resource_classes = {}
for node in tree.body:
    if not isinstance(node, ast.ClassDef):
        continue
    handlers = falcon_resource_handlers(node)
    if handlers:
        resource_classes[node.name] = handlers

for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "add_route":
        continue
    if len(node.args) < 2:
        continue
    path = const_str(node.args[0])
    class_name = falcon_add_route_class(node.args[1])
    if not path or not class_name or class_name not in resource_classes:
        continue
    path_params = set(path_param_names(path))
    line = node.lineno if hasattr(node, "lineno") else 1
    for method, fn in resource_classes[class_name].items():
        func_args = [a.arg for a in fn.args.args]
        row = {
            "method": method,
            "path": path,
            "line": line,
            "name": "%s_%s" % (class_name, fn.name),
            "returns": type(fn.body[-1]).__name__ if fn.body else None,
            "returnKind": None,
        }
        payload, status = peel_falcon_method_body(fn.body)
        if status is not None:
            row["statusCode"] = status
        sql_effects = collect_sql_effects(fn.body, func_args, path_params)
        if sql_effects:
            row["sqlEffects"] = sql_effects
        if payload is not None:
            fill_return_fields(row, payload, func_args, path_params)
        else:
            row["returnKind"] = "falcon-empty"
        routes.append(row)

# aiohttp: web.get|post|…('/path', handler) → same-file named handler (no middleware invent).
named_handlers = {}
for node in tree.body:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        named_handlers[node.name] = node

for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    if not isinstance(node.func, ast.Attribute):
        continue
    if not isinstance(node.func.value, ast.Name) or node.func.value.id != "web":
        continue
    if node.func.attr not in AIOHTTP_HTTP:
        continue
    if len(node.args) < 2:
        continue
    path = const_str(node.args[0])
    if not path or not isinstance(node.args[1], ast.Name):
        continue
    handler_name = node.args[1].id
    fn = named_handlers.get(handler_name)
    if fn is None:
        continue
    path_params = set(path_param_names(path))
    func_args = [a.arg for a in fn.args.args]
    line = node.lineno if hasattr(node, "lineno") else 1
    row = {
        "method": node.func.attr.upper(),
        "path": path,
        "line": line,
        "name": handler_name,
        "returns": type(fn.body[-1]).__name__ if fn.body else None,
        "returnKind": None,
    }
    fill_handler_return(row, fn.body, func_args, path_params)
    routes.append(row)

# Tornado: Application([(r"/path", Handler), …]) + class get/post/… (same-file only).
tornado_classes = {}
for node in tree.body:
    if not isinstance(node, ast.ClassDef):
        continue
    handlers = tornado_resource_handlers(node)
    if handlers:
        tornado_classes[node.name] = handlers

for node in ast.walk(tree):
    if not is_tornado_application_call(node):
        continue
    if not node.args or not isinstance(node.args[0], ast.List):
        continue
    line = node.lineno if hasattr(node, "lineno") else 1
    for elt in node.args[0].elts:
        if not isinstance(elt, ast.Tuple) or len(elt.elts) < 2:
            continue
        raw_path = const_str(elt.elts[0])
        class_name = tornado_handler_class_name(elt.elts[1])
        if not raw_path or not class_name or class_name not in tornado_classes:
            continue
        for method, fn in tornado_classes[class_name].items():
            func_args = [a.arg for a in fn.args.args]
            # Path captures after `self` map simple ([^/]+) groups.
            positional = [a for a in func_args if a != "self"]
            path = tornado_path_to_template(raw_path, positional)
            if not path:
                continue
            path_params = set(path_param_names(path))
            row = {
                "method": method,
                "path": path,
                "line": line,
                "name": "%s_%s" % (class_name, fn.name),
                "returns": type(fn.body[-1]).__name__ if fn.body else None,
                "returnKind": None,
            }
            payload, status = peel_tornado_method_body(fn.body)
            if status is not None:
                row["statusCode"] = status
            sql_effects = collect_sql_effects(fn.body, func_args, path_params)
            if sql_effects:
                row["sqlEffects"] = sql_effects
            if payload is not None:
                fill_return_fields(row, payload, func_args, path_params)
            else:
                row["returnKind"] = "tornado-empty"
            routes.append(row)

print(json.dumps({"schemaVersion": "0.1.0", "routes": routes}))
