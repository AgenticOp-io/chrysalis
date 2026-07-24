import 'dart:convert';

import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';

// hub-gold-dart-shelf — 20-route Shelf Router foundation (D6442).
// Inline + same-file named handlers (G10007) + Response.ok / Response(status) + jsonEncode.
// No Flutter / Dart Frog / shelf_static invent (D6447).

const _jsonHeaders = {'content-type': 'application/json'};

// Same-file named handlers (G10007 — Axum/Go Gin parallel; no Flutter invent).
Response healthHandler(Request request) {
  return Response.ok(jsonEncode(true), headers: _jsonHeaders);
}

Response pingHandler(Request request) {
  return Response.ok(jsonEncode(42), headers: _jsonHeaders);
}

Router buildRouter() {
  final router = Router();

  router.get('/health', healthHandler);

  router.get('/ping', pingHandler);

  router.get('/version', (Request request) {
    return Response.ok(jsonEncode(1), headers: _jsonHeaders);
  });

  router.get('/ready', (Request request) {
    return Response.ok(jsonEncode('ok'), headers: _jsonHeaders);
  });

  router.get('/count', (Request request) {
    return Response.ok(jsonEncode(3), headers: _jsonHeaders);
  });

  router.get('/flag', (Request request) {
    return Response.ok(jsonEncode('chrysalis'), headers: _jsonHeaders);
  });

  router.get('/build', (Request request) {
    return Response.ok(jsonEncode(2026), headers: _jsonHeaders);
  });

  router.get('/tier', (Request request) {
    return Response.ok(jsonEncode('gold'), headers: _jsonHeaders);
  });

  router.get('/meta', (Request request) {
    return Response.ok(
      jsonEncode({'service': 'hub-gold-dart-shelf', 'version': 1}),
      headers: _jsonHeaders,
    );
  });

  router.post('/echo', (Request request) async {
    final body = jsonDecode(await request.readAsString()) as Map;
    final kind = body['kind'] ?? 'plain';
    return Response.ok(
      jsonEncode({'echo': true, 'kind': kind}),
      headers: _jsonHeaders,
    );
  });

  router.get('/items', (Request request) {
    return Response.ok(jsonEncode(true), headers: _jsonHeaders);
  });

  router.get('/items/<id>', (Request request, String id) {
    return Response.ok(jsonEncode({'id': id}), headers: _jsonHeaders);
  });

  router.post('/items', (Request request) {
    return Response(
      201,
      body: jsonEncode({'created': true}),
      headers: _jsonHeaders,
    );
  });

  router.get('/search', (Request request) {
    final q = request.url.queryParameters['q'] ?? '';
    return Response.ok(jsonEncode({'q': q}), headers: _jsonHeaders);
  });

  router.put('/items/<id>', (Request request, String id) {
    return Response.ok(
      jsonEncode({'updated': true, 'id': id}),
      headers: _jsonHeaders,
    );
  });

  router.delete('/items/<id>', (Request request, String id) {
    return Response.ok(jsonEncode(true), headers: _jsonHeaders);
  });

  router.patch('/items/<id>', (Request request, String id) {
    return Response.ok(
      jsonEncode({'patched': true, 'id': id}),
      headers: _jsonHeaders,
    );
  });

  router.get('/users/<userId>', (Request request, String userId) {
    return Response.ok(userId);
  });

  router.get('/stats', (Request request) {
    return Response.ok(jsonEncode(3), headers: _jsonHeaders);
  });

  router.post('/notify', (Request request) {
    return Response(
      202,
      body: jsonEncode({'ok': true}),
      headers: _jsonHeaders,
    );
  });

  return router;
}
