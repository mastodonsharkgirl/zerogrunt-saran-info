import hashlib
import json
import sqlite3
import sys
import os
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

path, port = sys.argv[1], int(sys.argv[2])
db = sqlite3.connect(path)
db.execute('CREATE TABLE IF NOT EXISTS postings (key TEXT PRIMARY KEY, digest TEXT NOT NULL, receipt TEXT NOT NULL)')
db.execute('CREATE TABLE IF NOT EXISTS transient_faults (key TEXT PRIMARY KEY)')
db.execute('CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK (id=1), store_id TEXT NOT NULL)')
db.execute('INSERT OR IGNORE INTO meta VALUES(1,?)', (str(uuid.uuid4()),))
db.commit()
store_id = db.execute('SELECT store_id FROM meta WHERE id=1').fetchone()[0]
token = os.environ['INVOICE_LAB_TOKEN']

def compact(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False)

def digest(value):
    return hashlib.sha256(compact(value).encode()).hexdigest()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, code, body):
        data = compact(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.headers.get('Authorization') != 'Bearer ' + token or self.headers.get('Origin'):
            return self.reply(403, {'error': 'forbidden'})
        if self.path == '/health':
            return self.reply(200, {'storeId': store_id})
        if self.path == '/count':
            return self.reply(200, {'count': db.execute('SELECT count(*) FROM postings').fetchone()[0]})
        key = self.path.removeprefix('/invoices/')
        row = db.execute('SELECT receipt FROM postings WHERE key=?', (key,)).fetchone()
        if row:
            return self.reply(200, json.loads(row[0]))
        return self.reply(404, {'schemaVersion': 1, 'code': 'not_found', 'requestId': self.headers.get('X-Request-Id'), 'message': 'Synthetic ERP request rejected.'})

    def do_POST(self):
        if self.headers.get('Authorization') != 'Bearer ' + token or self.headers.get('Origin'):
            return self.reply(403, {'error': 'forbidden'})
        if self.path != '/invoices' or int(self.headers.get('Content-Length', '0')) > 16384:
            return self.reply(400, {'error': 'invalid request'})
        try:
            invoice = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            fields = ['entity', 'vendor', 'invoiceId', 'amountMinor', 'currency', 'purpose', 'coding']
            if sorted(invoice.keys()) != sorted(fields) or any(not isinstance(invoice[field], str) or not invoice[field] for field in fields if field != 'amountMinor') or type(invoice['amountMinor']) is not int or invoice['amountMinor'] <= 0 or invoice['currency'] != 'INR':
                raise ValueError()
            identity = [invoice['entity'], invoice['vendor'], invoice['invoiceId']]
            key = digest(['invoice-lab-v1', *identity])
            payload_digest = digest([invoice[field] for field in fields])
            if self.headers.get('Idempotency-Key') != key:
                raise ValueError()
            if self.headers.get('X-Lab-Fault') == 'transient-once':
                existing_fault = db.execute('SELECT 1 FROM transient_faults WHERE key=?', (key,)).fetchone()
                if not existing_fault:
                    with db:
                        db.execute('INSERT INTO transient_faults VALUES(?)', (key,))
                    data = compact({'error': 'synthetic transient'}).encode()
                    self.send_response(503)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Retry-After', '1')
                    self.send_header('Content-Length', str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
            existing = db.execute('SELECT digest, receipt FROM postings WHERE key=?', (key,)).fetchone()
            if existing:
                if existing[0] != payload_digest:
                    return self.reply(409, {'error': 'identity payload conflict'})
                return self.reply(200, json.loads(existing[1]))
            receipt = {'schemaVersion': 1, 'invoice': invoice, 'businessKey': compact(identity), 'idempotencyKey': key, 'payloadDigest': payload_digest, 'receiptId': str(uuid.uuid4()), 'committedAt': datetime.now(timezone.utc).isoformat(), 'storeId': store_id}
            with db:
                db.execute('INSERT INTO postings VALUES(?,?,?)', (key, payload_digest, compact(receipt)))
            if self.headers.get('X-Lab-Fault') == 'lose-after-commit':
                self.connection.shutdown(2)
                self.connection.close()
                return
            return self.reply(201, receipt)
        except (ValueError, KeyError, json.JSONDecodeError):
            return self.reply(400, {'error': 'invalid invoice'})

HTTPServer(('127.0.0.1', port), Handler).serve_forever()
