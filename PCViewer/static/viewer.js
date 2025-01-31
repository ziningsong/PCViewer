class PointCloudViewer {
    constructor() {
        // 使用相同的主机名但不同的端口
        const host = window.location.hostname || 'localhost';
        this.socket = new WebSocket(`ws://${host}:8765`);
        
        // 显示连接状态
        const status = document.createElement('div');
        status.style.position = 'fixed';
        status.style.bottom = '10px';
        status.style.left = '10px';
        status.style.padding = '5px';
        status.style.background = 'rgba(0,0,0,0.5)';
        status.style.color = 'white';
        document.body.appendChild(status);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.pointCloud = null;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.fps = 30;
        this.totalFrames = 30;  // 默认值，将通过服务器消息更新
        this.controls = null;
        this.axesHelper = null;
        this.gridHelper = null;
        this.ringHelperXY = null;
        this.ringHelperYZ = null;
        this.ringHelperXZ = null;
        this.currentControlMode = 'orbit';

        this.init();
        this.initControls();
        this.animate();

        // 添加连接状态监听
        this.socket.onopen = () => {
            console.log("WebSocket connected");
            status.textContent = "Connected";
            status.style.background = 'rgba(0,255,0,0.5)';
            this.loadFrame(0);  // 连接成功后立即加载第一帧
        };
        
        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            status.textContent = "Connection Error";
            status.style.background = 'rgba(255,0,0,0.5)';
        };

        this.socket.onclose = () => {
            console.log("WebSocket closed");
            status.textContent = "Disconnected";
            status.style.background = 'rgba(255,0,0,0.5)';
        };
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);  // 设置背景色为黑色
        document.body.appendChild(this.renderer.domElement);
        
        // 调整相机初始位置，使其在x和y轴的45度位置，并稍微抬高以便看到z轴向上
        const distance = 5;
        const angle = Math.PI / 4;  // 45度
        const height = 3;
        this.camera.position.set(
            distance * Math.cos(angle),  // x
            distance * Math.sin(angle),  // y
            height                       // z
        );
        // 让相机看向原点
        this.camera.lookAt(0, 0, 0);
        // 调整相机上方向为z轴正方向
        this.camera.up.set(0, 0, 1);
        
        // 使用try-catch处理OrbitControls初始化
        try {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            
            // 设置控制限制
            this.controls.minDistance = 1;  // 最小缩放距离
            this.controls.maxDistance = 10;  // 最大缩放距离
            this.controls.rotateSpeed = 0.5;  // 降低旋转速度使控制更精确
            
            // 取消极角限制，允许完全翻转
            this.controls.minPolarAngle = 0;          // 允许旋转到顶部
            this.controls.maxPolarAngle = Math.PI;    // 允许旋转到底部
            
            // 取消方位角限制，允许任意水平旋转
            this.controls.enableRotate = true;
            this.controls.minAzimuthAngle = -Infinity;  // 无限制
            this.controls.maxAzimuthAngle = Infinity;   // 无限制
        } catch (error) {
            console.error("Failed to initialize OrbitControls:", error);
        }

        // 添加平面指示环
        const ringGeometry = new THREE.RingGeometry(0.8, 0.9, 32);
        const materials = {
            xy: new THREE.MeshBasicMaterial({ 
                color: 0x0000ff, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            }),
            yz: new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            }),
            xz: new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            })
        };

        this.ringHelperXY = new THREE.Mesh(ringGeometry, materials.xy);
        this.ringHelperYZ = new THREE.Mesh(ringGeometry, materials.yz);
        this.ringHelperXZ = new THREE.Mesh(ringGeometry, materials.xz);

        // 调整指示环方向以匹配新的坐标系
        this.ringHelperXY.rotation.x = -Math.PI / 2;  // XY平面（垂直于Z轴）
        this.ringHelperYZ.rotation.y = -Math.PI / 2;  // YZ平面（垂直于X轴）
        this.ringHelperXZ.rotation.z = Math.PI / 2;   // XZ平面（垂直于Y轴）

        // 添加调试输出
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received message type:", data.type);
            if (data.type === 'point_cloud') {
                console.log("Points count:", data.points.length);
                this.updatePointCloud(data.points, data.colors);
            } else if (data.type === 'init') {
                // 服务器可以发送初始化信息
                this.totalFrames = data.total_frames;
                document.getElementById('frameSlider').max = this.totalFrames - 1;

                // 根据服务器配置显示辅助线
                if (data.show_axes) {
                    this.axesHelper = new THREE.AxesHelper(1);
                    this.scene.add(this.axesHelper);
                    
                    // 添加平面指示环
                    this.scene.add(this.ringHelperXY);
                    this.scene.add(this.ringHelperYZ);
                    this.scene.add(this.ringHelperXZ);
                }
                if (data.show_grid) {
                    this.gridHelper = new THREE.GridHelper(2, 10);
                    this.gridHelper.rotation.x = Math.PI / 2;  // 旋转到XZ平面
                    this.scene.add(this.gridHelper);
                }
            }
        };

        // 添加窗口大小改变监听
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.initCameraControls();
    }

    updatePointCloud(points, colors) {
        console.log("Updating point cloud");
        const geometry = new THREE.BufferGeometry();
        
        // 确保points是标准格式
        const positions = new Float32Array(points.flat());
        const colorValues = new Float32Array(colors.flat());
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorValues, 3));
        
        const material = new THREE.PointsMaterial({ 
            size: 0.05,           // 增大点的大小
            vertexColors: true,   // 启用顶点颜色
            sizeAttenuation: true
        });
        
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
        }
        this.pointCloud = new THREE.Points(geometry, material);
        this.scene.add(this.pointCloud);
        
        console.log("Point cloud updated");
    }

    initControls() {
        const frameSlider = document.getElementById('frameSlider');
        const playButton = document.getElementById('playButton');
        const fpsSlider = document.getElementById('fpsSlider');
        
        frameSlider.oninput = () => {
            this.currentFrame = parseInt(frameSlider.value);
            document.getElementById('frameNumber').textContent = this.currentFrame;
            this.loadFrame(this.currentFrame);
        };

        playButton.onclick = () => {
            this.isPlaying = !this.isPlaying;
            playButton.textContent = this.isPlaying ? 'Pause' : 'Play';
        };

        fpsSlider.oninput = () => {
            this.fps = parseInt(fpsSlider.value);
            document.getElementById('fpsValue').textContent = this.fps;
        };
    }

    loadFrame(frameIdx) {
        this.socket.send(JSON.stringify({
            command: 'load_frame',
            frame_idx: frameIdx
        }));
    }

    initCameraControls() {
        try {
            // 初始化默认控制器
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.rotateSpeed = 0.5;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;

            // 取消极角限制，允许完全翻转
            this.controls.minPolarAngle = 0;          // 允许旋转到顶部
            this.controls.maxPolarAngle = Math.PI;    // 允许旋转到底部
            
            // 取消方位角限制，允许任意水平旋转
            this.controls.enableRotate = true;
            this.controls.minAzimuthAngle = -Infinity;  // 无限制
            this.controls.maxAzimuthAngle = Infinity;   // 无限制

            // 设置默认的up方向为z轴
            this.controls.object.up.set(0, 0, 1);
            
            // 可选：限制相机垂直旋转，以保持z轴朝上的观感
            // this.controls.minPolarAngle = Math.PI / 6;   // 限制最小仰角
            // this.controls.maxPolarAngle = Math.PI / 2;   // 限制最大俯角

            // 添加控制模式切换监听
            const orbitBtn = document.getElementById('orbitMode');
            const trackballBtn = document.getElementById('trackballMode');
            const flyBtn = document.getElementById('flyMode');

            if (orbitBtn && trackballBtn && flyBtn) {
                orbitBtn.onclick = () => this.switchControlMode('orbit', orbitBtn);
                trackballBtn.onclick = () => this.switchControlMode('trackball', trackballBtn);
                flyBtn.onclick = () => this.switchControlMode('fly', flyBtn);
                console.log("Camera control mode buttons initialized");
            } else {
                console.error("Could not find control mode buttons");
            }

        } catch (error) {
            console.error("Failed to initialize camera controls:", error);
        }
    }

    switchControlMode(mode, button) {
        console.log(`Switching to ${mode} mode`);
        // 移除旧的控制器
        if (this.controls) {
            this.controls.dispose();
        }

        // 更新按钮状态
        document.querySelectorAll('.control-mode button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // 保存当前相机位置和朝向
        const position = this.camera.position.clone();
        const target = this.controls ? this.controls.target.clone() : new THREE.Vector3();

        // 根据模式创建新的控制器
        switch (mode) {
            case 'orbit':
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.rotateSpeed = 0.5;
                // 同样在切换模式时也取消限制
                this.controls.minPolarAngle = 0;
                this.controls.maxPolarAngle = Math.PI;
                this.controls.minAzimuthAngle = -Infinity;
                this.controls.maxAzimuthAngle = Infinity;
                break;
                
            case 'trackball':
                this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
                this.controls.rotateSpeed = 1.0;
                this.controls.dynamicDampingFactor = 0.3;
                break;
                
            case 'fly':
                this.controls = new THREE.FlyControls(this.camera, this.renderer.domElement);
                this.controls.movementSpeed = 0.1;
                this.controls.rollSpeed = 0.05;
                this.controls.dragToLook = true;
                break;
        }

        // 恢复相机位置和朝向
        this.camera.position.copy(position);
        if (this.controls.target) {
            this.controls.target.copy(target);
        }

        // 在切换模式时保持z轴朝上
        this.camera.up.set(0, 0, 1);
        if (this.controls.object) {
            this.controls.object.up.set(0, 0, 1);
        }

        this.currentControlMode = mode;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 根据不同模式更新控制器
        if (this.controls) {
            if (this.currentControlMode === 'fly') {
                this.controls.update(0.1);
            } else {
                this.controls.update();
            }
        }
        
        if (this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        if (this.isPlaying) {
            const now = Date.now();
            const frameInterval = 1000 / this.fps;
            
            if (!this.lastFrameTime || now - this.lastFrameTime >= frameInterval) {
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                document.getElementById('frameSlider').value = this.currentFrame;
                document.getElementById('frameNumber').textContent = this.currentFrame;
                this.loadFrame(this.currentFrame);
                this.lastFrameTime = now;
            }
        }
    }
}

// 创建查看器实例
const viewer = new PointCloudViewer();
