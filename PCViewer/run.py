import asyncio
from http_server import run_server
from server import PointCloudServer
import websockets
import threading
import numpy as np

async def run_websocket_server(point_clouds, colors=None, show_axes=True, show_rings=True):
    """运行WebSocket服务器"""
    server = PointCloudServer(point_clouds, colors, show_axes, show_rings)
    async with websockets.serve(server.handle_connection, "0.0.0.0", 8765):
        print("WebSocket server is running on ws://0.0.0.0:8765")
        await asyncio.Future()

def run_http_server_thread():
    """在独立线程中运行HTTP服务器"""
    run_server()

def start_servers(point_clouds, colors=None, show_axes=True, show_rings=True):
    """启动服务器
    Args:
        point_clouds: 点云数据序列，shape为(n_frames, n_points, 3)
        colors: 点云颜色序列，shape为(n_frames, n_points, 3)
        show_axes: 是否显示坐标轴
        show_rings: 是否显示辅助环
    """
    # 启动HTTP服务器（在新线程中）
    http_thread = threading.Thread(target=run_http_server_thread)
    http_thread.daemon = True  # 设置为守护线程，这样主程序退出时会自动结束
    http_thread.start()

    # 启动WebSocket服务器（在主线程中）
    asyncio.run(run_websocket_server(point_clouds, colors, show_axes, show_rings))

if __name__ == "__main__":
    # 示例：创建一些测试数据
    n_frames = 30
    n_points = 1000
    
    # 生成一个旋转的立方体点云
    point_clouds = []
    colors = []
    for i in range(n_frames):
        angle = i * 2 * np.pi / n_frames
        points = np.random.rand(n_points, 3) * 2 - 1
        
        rotation = np.array([
            [np.cos(angle), -np.sin(angle), 0],
            [np.sin(angle), np.cos(angle), 0],
            [0, 0, 1]
        ])
        points = points @ rotation.T
        
        color = np.zeros((n_points, 3))
        color[:, 0] = points[:, 0] / 2 + 0.5
        color[:, 1] = points[:, 1] / 2 + 0.5
        color[:, 2] = points[:, 2] / 2 + 0.5
        
        point_clouds.append(points)
        colors.append(color)
    
    point_clouds = np.array(point_clouds)
    colors = np.array(colors)
    
    print("Starting visualization servers...")
    print("Please open http://localhost:8000 in your browser")
    start_servers(point_clouds, colors)
