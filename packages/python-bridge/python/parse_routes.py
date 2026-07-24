"""Extract Flask/FastAPI/Starlette/Litestar/Falcon-style route metadata from Python source (hub ingest)."""
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
    """Flask `<id>` / `<int:id>` and FastAPI `{id}` → bare param names."""
    names = []
    for raw in re.findall(r"<([^>]+)>", path):
        names.append(raw.split(":", 1)[-1].strip())
    for raw in re.findall(r"\{([^{}]+)\}", path):
        names.append(raw.split(":", 1)[-1].strip())
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
        "query_params": "query",
        "params": "query",
        "view_args": "path",
        "path_params": "path",
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
        if isinstance(node.func, ast.Name) and node.func.id == "jsonify":
            if node.args and len(node.args) == 1:
                return expr_tree(node.args[0], func_args, path_params)
            out = {"t": "obj", "entries": []}
            for kw in node.keywords:
                if kw.arg is None:
                    return None
                val = expr_tree(kw.value, func_args, path_params)
                if val is None:
                    return None
                out["entries"].append({"key": kw.arg, "value": val})
            return out if out["entries"] else None
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
    for k in kw:
        if k.arg == "methods" and isinstance(k.value, (ast.List, ast.Tuple)):
            out = []
            for elt in k.value.elts:
                s = const_str(elt)
                if s:
                    out.append(s.upper())
            return out
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


def route_from_decorator(dec):
    if not isinstance(dec, ast.Call):
        return None
    func = dec.func
    line = dec.lineno if hasattr(dec, "lineno") else 1
    path = path_from_call(dec)
    if not path:
        return None
    # Litestar: @get("/path") / @post(..., status_code=201) — bare HTTP Name.
    if isinstance(func, ast.Name) and func.id in HTTP_NAMES:
        return route_rows(func.id, path, dec.keywords, line)
    # Flask/FastAPI/Starlette: @app.get / @app.route / @router.post
    if not isinstance(func, ast.Attribute):
        return None
    if func.attr not in HTTP_NAMES:
        return None
    recv = func.value
    if isinstance(recv, ast.Name) and recv.id not in RECEIVERS:
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


routes = []
for node in tree.body:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        continue
    func_args = [a.arg for a in node.args.args]
    for dec in node.decorator_list:
        found = route_from_decorator(dec)
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
                sql_effects = collect_sql_effects(node.body, func_args, path_params)
                if sql_effects:
                    row["sqlEffects"] = sql_effects
                if node.body:
                    last = node.body[-1]
                    if isinstance(last, ast.Return) and last.value is not None:
                        ret = last.value
                        payload, status_code = peel_status_tuple(ret)
                        if payload is not None:
                            ret = payload
                            row["statusCode"] = status_code
                        fill_return_fields(row, ret, func_args, path_params)
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

print(json.dumps({"schemaVersion": "0.1.0", "routes": routes}))
