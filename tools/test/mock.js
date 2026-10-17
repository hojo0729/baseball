// stand-in for supabase-js realtime: broadcast + presence between tabs via BroadcastChannel
window.supabase = { createClient() { return { channel(name, opts) { return new MockCh(name, opts); }, removeChannel(ch) { ch._close(); } }; } };
class MockCh {
  constructor(name, opts) { this.key = opts.config.presence.key; this.bc = new BroadcastChannel(name); this.h = { broadcast: [], presence: [] }; this.peers = {}; this.bc.onmessage = e => this._rx(e.data); }
  on(type, filter, cb) { this.h[type].push(cb); return this; }
  subscribe(cb) { setTimeout(() => cb('SUBSCRIBED'), 50); return this; }
  track(meta) { this.peers[this.key] = [meta]; this.bc.postMessage({ k: 'join', key: this.key }); this._sync(); }
  _rx(d) {
    if (d.k === 'join') { const isNew = !this.peers[d.key]; this.peers[d.key] = [{}]; if (isNew) this.bc.postMessage({ k: 'join', key: this.key }); this._sync(); }
    else if (d.k === 'leave') { delete this.peers[d.key]; this._sync(); }
    else if (d.k === 'b') setTimeout(() => this.h.broadcast.forEach(cb => cb({ payload: d.payload })), 80);   // fake latency
  }
  _sync() { this.h.presence.forEach(cb => cb()); }
  presenceState() { return this.peers; }
  send(m) { this.bc.postMessage({ k: 'b', payload: m.payload }); return Promise.resolve('ok'); }
  _close() { this.bc.postMessage({ k: 'leave', key: this.key }); this.bc.close(); }
}
