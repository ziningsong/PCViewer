import asyncio
import websockets
import json
import numpy as np
import torch
from typing import Union, Optional

class PointCloudServer:
    def __init__(self, point_clouds: Union[np.ndarray, torch.Tensor], colors: Optional[Union[np.ndarray, torch.Tensor]] = None, show_axes: bool = True, show_rings: bool = True):
        """初始化点云服务器
        Args:
            point_clouds: 点云数据序列，shape为(n_frames, n_points, 3)
            colors: 点云颜色序列，shape为(n_frames, n_points, 3)，值范围[0,1]
            show_axes: 是否显示坐标轴
            show_rings: 是否显示环
        """
        if isinstance(point_clouds, torch.Tensor):
            self.point_clouds = point_clouds.detach().cpu().numpy()
        elif isinstance(point_clouds, np.ndarray):
            self.point_clouds = point_clouds
        else:
            raise ValueError("point_clouds must be either np.ndarray or torch.Tensor")
            
        if len(self.point_clouds.shape) != 3 or self.point_clouds.shape[-1] != 3:
            raise ValueError("point_clouds shape must be (n_frames, n_points, 3)")
            
        self.n_frames = len(self.point_clouds)
        self.connections = set()

        if colors is not None:
            if isinstance(colors, torch.Tensor):
                self.colors = colors.detach().cpu().numpy()
            elif isinstance(colors, np.ndarray):
                self.colors = colors
            else:
                raise ValueError("colors must be either np.ndarray or torch.Tensor")
                
            if self.colors.shape != self.point_clouds.shape:
                raise ValueError("colors shape must match point_clouds shape")
        else:
            # 默认蓝色
            self.colors = np.full_like(self.point_clouds, [0, 0, 1])
        
        self.show_axes = show_axes
        self.show_rings = show_rings  # 改为show_rings

    async def handle_connection(self, websocket):
        print("New client connected")
        self.connections.add(websocket)
        try:
            # 发送初始化信息
            await websocket.send(json.dumps({
                'type': 'init',
                'total_frames': self.n_frames,
                'show_axes': self.show_axes,
                'show_rings': self.show_rings  # 改为show_rings
            }))
            
            while True:
                message = await websocket.recv()
                print(f"Received message: {message}")
                await self.handle_message(websocket, json.loads(message))
        except websockets.ConnectionClosed:
            print("Client disconnected")
            self.connections.remove(websocket)
        except Exception as e:
            print(f"Error: {e}")
            self.connections.remove(websocket)

    async def handle_message(self, websocket, message):
        cmd = message.get('command')
        if cmd == 'load_frame':
            frame_idx = message.get('frame_idx', 0)
            frame_idx = frame_idx % self.n_frames
            points = self.point_clouds[frame_idx].tolist()
            colors = self.colors[frame_idx].tolist()
            print(f"Sending frame {frame_idx}, points: {len(points)}")
            await websocket.send(json.dumps({
                'type': 'point_cloud',
                'points': points,
                'colors': colors
            }))

if __name__ == "__main__":
    async def main():
        # 创建示例点云数据
        n_frames = 30
        n_points = 1000
        
        # 生成一个旋转的立方体点云
        point_clouds = []
        colors = []
        for i in range(n_frames):
            # 创建立方体顶点
            angle = i * 2 * np.pi / n_frames
            points = np.random.rand(n_points, 3) * 2 - 1  # 范围[-1, 1]
            
            # 应用旋转
            rotation = np.array([
                [np.cos(angle), -np.sin(angle), 0],
                [np.sin(angle), np.cos(angle), 0],
                [0, 0, 1]
            ])
            points = points @ rotation.T
            
            # 为每个点设置渐变色
            color = np.zeros((n_points, 3))
            color[:, 0] = points[:, 0] / 2 + 0.5  # R
            color[:, 1] = points[:, 1] / 2 + 0.5  # G
            color[:, 2] = points[:, 2] / 2 + 0.5  # B
            
            point_clouds.append(points)
            colors.append(color)
        
        point_clouds = np.array(point_clouds)
        colors = np.array(colors)
        
        print(f"Starting server with {n_frames} frames, {n_points} points per frame")
        server = PointCloudServer(point_clouds, colors)
        
        # 确保服务器监听所有地址
        async with websockets.serve(server.handle_connection, "0.0.0.0", 8765):
            print("WebSocket server is running on ws://0.0.0.0:8765")
            await asyncio.Future()
            
    asyncio.run(main())
