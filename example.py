import numpy as np
from pcviewer import start_servers


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
