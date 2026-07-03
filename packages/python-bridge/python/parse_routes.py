"""Extract Flask/FastAPI-style route metadata from Python source (hub ingest)."""
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
    return re.findall(r"<([^>]+)>", path)


def request_bucket_map(bucket):
    return {
        "args": "query",
        "view_args": "path",
        "headers": "header",
        "cookies": "cookie",
    }.get(bucket)


def request_ref_from_get_call(node):
    if not isinstance(node, ast.Call):
        return None
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "get":
        return None
    inner = node.func.value
    if not isinstance(inner, ast.Attribute):
        return None
    if not isinstance(inner.value, ast.Name) or inner.value.id != "request":
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
    if len(node.args) >= 2:
        default = const_val(node.args[1])
        if default is not None:
            ref["default"] = default
    return ref


def request_ref_from_subscript(node):
    if not isinstance(node, ast.Subscript):
        return None
    if not isinstance(node.value, ast.Attribute):
        return None
    inner = node.value
    if not isinstance(inner.value, ast.Name) or inner.value.id != "request":
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


def route_from_decorator(dec):
    if not isinstance(dec, ast.Call):
        return None
    func = dec.func
    if not isinstance(func, ast.Attribute):
        return None
    if func.attr not in HTTP_NAMES:
        return None
    recv = func.value
    if isinstance(recv, ast.Name) and recv.id not in RECEIVERS:
        return None
    if not dec.args:
        return None
    path = const_str(dec.args[0])
    if not path:
        return None
    if func.attr == "route":
        methods = methods_from_keywords(dec.keywords) or ["GET"]
    else:
        methods = [func.attr.upper()]
    line = dec.lineno if hasattr(dec, "lineno") else 1
    return [{"method": m, "path": path, "line": line} for m in methods]


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
                sql_effects = collect_sql_effects(node.body, func_args, path_params)
                if sql_effects:
                    row["sqlEffects"] = sql_effects
                if node.body:
                    last = node.body[-1]
                    if isinstance(last, ast.Return) and last.value is not None:
                        ret = last.value
                        tree_val = expr_tree(ret, func_args, path_params)
                        if tree_val is not None:
                            row["returnTree"] = tree_val
                            row["returnKind"] = "tree"
                        elif isinstance(ret, ast.Call) and isinstance(ret.func, ast.Name) and ret.func.id == "jsonify":
                            d = jsonify_payload(ret)
                            if d is not None:
                                row["returnKind"] = "json"
                                row["returnValue"] = d
                            else:
                                row["returnKind"] = "jsonify"
                        else:
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
                routes.append(row)
            break

print(json.dumps({"schemaVersion": "0.1.0", "routes": routes}))
