from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # 设置静态文件目录
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        os.chdir(static_dir)
        super().__init__(*args, **kwargs)

def run_server(host='0.0.0.0', port=8000):
    server = HTTPServer((host, port), CustomHandler)
    print(f"HTTP server is running on http://{host}:{port}")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
