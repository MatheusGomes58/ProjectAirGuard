#!/usr/bin/env python3
# ==============================================================================
# main.py — Raspberry Pi Camera Server
# WebSocket: streaming de vídeo em tempo real (MJPEG via WS)
# ==============================================================================
import asyncio
import io
import json
import threading

import websockets
from picamera2 import Picamera2

from config import (
    WS_HOST, WS_PORT,
    CAMERA_WIDTH, CAMERA_HEIGHT, CAMERA_FPS, JPEG_QUALITY,
)


# ==============================================================================
# Camera Manager
# ==============================================================================
class CameraStream:
    """Captura frames da câmera e disponibiliza para WebSocket."""

    def __init__(self):
        self.camera = Picamera2()
        self.frame = None
        self.lock = threading.Lock()
        self.running = False

    def start(self):
        config = self.camera.create_video_configuration(
            main={"size": (CAMERA_WIDTH, CAMERA_HEIGHT), "format": "RGB888"},
            controls={"FrameRate": CAMERA_FPS}
        )
        self.camera.configure(config)
        self.camera.start()
        self.running = True
        print(f"[camera] Iniciada {CAMERA_WIDTH}x{CAMERA_HEIGHT} @ {CAMERA_FPS}fps")

    def stop(self):
        self.running = False
        self.camera.stop()
        print("[camera] Parada")

    def capture_jpeg(self):
        """Captura um frame JPEG."""
        if not self.running:
            return None
        stream = io.BytesIO()
        self.camera.capture_file(stream, format='jpeg')
        stream.seek(0)
        data = stream.read()
        with self.lock:
            self.frame = data
        return data

    def get_frame(self):
        """Retorna o último frame capturado."""
        with self.lock:
            return self.frame


# ==============================================================================
# WebSocket Server (streaming MJPEG)
# ==============================================================================
class WebSocketServer:
    def __init__(self, camera_stream):
        self.camera = camera_stream
        self.clients = set()

    async def handler(self, websocket, path):
        """Handler para cada cliente WebSocket conectado."""
        self.clients.add(websocket)
        client_ip = websocket.remote_address[0]
        print(f"[ws] Cliente conectado: {client_ip} (total: {len(self.clients)})")

        try:
            await websocket.send(json.dumps({
                "type": "info",
                "resolution": f"{CAMERA_WIDTH}x{CAMERA_HEIGHT}",
                "fps": CAMERA_FPS,
            }))

            while True:
                frame = self.camera.get_frame()
                if frame:
                    await websocket.send(frame)
                await asyncio.sleep(1.0 / CAMERA_FPS)

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            print(f"[ws] Cliente desconectado: {client_ip} (total: {len(self.clients)})")

    async def start(self):
        server = await websockets.serve(self.handler, WS_HOST, WS_PORT)
        print(f"[ws] Servidor WebSocket em ws://{WS_HOST}:{WS_PORT}")
        return server


# ==============================================================================
# Main
# ==============================================================================
async def camera_loop(camera_stream):
    """Loop de captura de frames."""
    while True:
        camera_stream.capture_jpeg()
        await asyncio.sleep(1.0 / CAMERA_FPS)


async def main():
    print("=" * 50)
    print("  EcoBreath Shield — Camera Server")
    print("  WebSocket Streaming")
    print("=" * 50)
    print()

    camera = CameraStream()
    camera.start()

    ws_server = WebSocketServer(camera)
    await ws_server.start()

    print(f"  WebSocket: ws://0.0.0.0:{WS_PORT}")
    print()

    try:
        await camera_loop(camera)
    except KeyboardInterrupt:
        pass
    finally:
        camera.stop()
        print("[main] Encerrado")


if __name__ == "__main__":
    asyncio.run(main())
