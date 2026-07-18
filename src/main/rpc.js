// Discord Rich Presence sin dependencias: protocolo IPC del cliente de
// Discord sobre named pipe (\\.\pipe\discord-ipc-N). Frames binarios:
// [opcode u32 LE][longitud u32 LE][payload JSON].

import net from 'node:net'
import { EventEmitter } from 'node:events'

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 }

export class DiscordRPC extends EventEmitter {
  constructor(clientId) {
    super()
    this.clientId = String(clientId)
    this.sock = null
    this.ready = false
    this.buf = Buffer.alloc(0)
  }

  // Prueba los pipes 0-9; resuelve true si Discord acepta el handshake (READY)
  connect() {
    return new Promise((resolve) => {
      const tryPipe = (i) => {
        if (i > 9) return resolve(false)
        const sock = net.connect(`\\\\.\\pipe\\discord-ipc-${i}`)
        sock.once('connect', () => {
          this.sock = sock
          sock.on('data', (d) => this.onData(d))
          sock.on('error', () => {})
          sock.on('close', () => {
            this.ready = false
            this.sock = null
            this.emit('close')
          })
          this.send(OP.HANDSHAKE, { v: 1, client_id: this.clientId })
          const timer = setTimeout(() => resolve(this.ready), 4000)
          this.once('ready', () => {
            clearTimeout(timer)
            resolve(true)
          })
          this.once('close', () => {
            clearTimeout(timer)
            resolve(false)
          })
        })
        sock.once('error', () => tryPipe(i + 1))
      }
      tryPipe(0)
    })
  }

  onData(d) {
    this.buf = Buffer.concat([this.buf, d])
    while (this.buf.length >= 8) {
      const op = this.buf.readUInt32LE(0)
      const len = this.buf.readUInt32LE(4)
      if (this.buf.length < 8 + len) break
      const payload = this.buf.subarray(8, 8 + len).toString('utf8')
      this.buf = this.buf.subarray(8 + len)
      try {
        const msg = JSON.parse(payload)
        if (msg.evt === 'READY') {
          this.ready = true
          this.emit('ready')
        } else if (op === OP.PING) {
          this.send(OP.PONG, msg)
        } else if (op === OP.CLOSE || msg.evt === 'ERROR') {
          this.destroy()
          this.emit('close')
        }
      } catch {
        // frame no-JSON: ignorar
      }
    }
  }

  send(op, obj) {
    if (!this.sock) return
    const json = Buffer.from(JSON.stringify(obj), 'utf8')
    const head = Buffer.alloc(8)
    head.writeUInt32LE(op, 0)
    head.writeUInt32LE(json.length, 4)
    try {
      this.sock.write(Buffer.concat([head, json]))
    } catch {
      /* pipe roto: el close se encarga */
    }
  }

  setActivity(activity) {
    if (!this.ready) return
    this.send(OP.FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity },
      nonce: String(Date.now())
    })
  }

  destroy() {
    try {
      this.sock?.destroy()
    } catch {
      /* ya cerrado */
    }
    this.sock = null
    this.ready = false
  }
}
