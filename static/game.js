// 常量定义
const COLORS = {
    SNAKE: '#00FF00',
    FOOD: '#FF0000',
    OBSTACLE: '#808080'
};

// 节点类 - 用于A*寻路
class Node {
    constructor(position, parent = null) {
        this.position = position;
        this.parent = parent;
        this.g = 0;  // 从起点到当前节点的成本
        this.h = 0;  // 从当前节点到终点的估计成本
        this.f = 0;  // f = g + h
    }
}

// 蛇类
class Snake {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.length = 1;
        this.positions = [{
            x: Math.floor(this.game.width / (2 * this.game.blockSize)) * this.game.blockSize,
            y: Math.floor(this.game.height / (2 * this.game.blockSize)) * this.game.blockSize
        }];
        this.direction = { x: 1, y: 0 };
        this.path = [];
    }

    setDirection(x, y) {
        // 防止反向移动
        if (this.direction.x !== -x || this.direction.y !== -y) {
            this.direction = { x, y };
        }
    }

    update() {
        const head = this.positions[0];
        const newHead = {
            x: head.x + this.direction.x * this.game.blockSize,
            y: head.y + this.direction.y * this.game.blockSize
        };

        // 检查碰撞
        if (this.checkCollision(newHead)) {
            this.game.gameOver = true;
            return false;
        }

        this.positions.unshift(newHead);
        if (this.positions.length > this.length) {
            this.positions.pop();
        }

        return true;
    }

    checkCollision(position) {
        // 检查墙壁碰撞
        if (position.x < 0 || position.x >= this.game.width ||
            position.y < 0 || position.y >= this.game.height) {
            return true;
        }

        // 检查自身碰撞
        for (let i = 1; i < this.positions.length; i++) {
            if (position.x === this.positions[i].x && position.y === this.positions[i].y) {
                return true;
            }
        }

        // 检查障碍物碰撞
        return this.game.obstacles.positions.some(obs => 
            position.x === obs.x && position.y === obs.y
        );
    }

    draw() {
        this.game.ctx.fillStyle = COLORS.SNAKE;
        this.positions.forEach(pos => {
            this.game.ctx.fillRect(pos.x, pos.y, this.game.blockSize, this.game.blockSize);
        });
    }

    findPathToFood() {
        // A*寻路算法实现
        const start = {
            x: Math.floor(this.positions[0].x / this.game.blockSize),
            y: Math.floor(this.positions[0].y / this.game.blockSize)
        };
        const end = {
            x: Math.floor(this.game.food.position.x / this.game.blockSize),
            y: Math.floor(this.game.food.position.y / this.game.blockSize)
        };

        const openList = [];
        const closedList = [];
        openList.push(new Node(start));

        while (openList.length > 0) {
            const currentNode = openList.reduce((min, node) => 
                node.f < min.f ? node : min, openList[0]);
            
            openList.splice(openList.indexOf(currentNode), 1);
            closedList.push(currentNode);

            if (currentNode.position.x === end.x && currentNode.position.y === end.y) {
                const path = [];
                let current = currentNode;
                while (current !== null) {
                    path.push({
                        x: current.position.x * this.game.blockSize,
                        y: current.position.y * this.game.blockSize
                    });
                    current = current.parent;
                }
                return path.reverse();
            }

            const directions = [{x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}];
            for (let dir of directions) {
                const newPos = {
                    x: currentNode.position.x + dir.x,
                    y: currentNode.position.y + dir.y
                };

                if (this.checkCollision({
                    x: newPos.x * this.game.blockSize,
                    y: newPos.y * this.game.blockSize
                })) continue;

                const newNode = new Node(newPos, currentNode);
                if (closedList.some(node => 
                    node.position.x === newPos.x && node.position.y === newPos.y
                )) continue;

                newNode.g = currentNode.g + 1;
                newNode.h = Math.pow(newPos.x - end.x, 2) + Math.pow(newPos.y - end.y, 2);
                newNode.f = newNode.g + newNode.h;

                const openNode = openList.find(node => 
                    node.position.x === newPos.x && node.position.y === newPos.y
                );

                if (!openNode || openNode.g > newNode.g) {
                    openList.push(newNode);
                }
            }
        }
        return null;
    }

    autoMove() {
        if (!this.path || this.path.length === 0) {
            this.path = this.findPathToFood();
            if (!this.path) return false;
        }

        if (this.path.length > 1) {
            const nextPos = this.path[1];
            const currentPos = this.positions[0];
            
            this.setDirection(
                (nextPos.x - currentPos.x) / this.game.blockSize,
                (nextPos.y - currentPos.y) / this.game.blockSize
            );
            
            this.path = this.path.slice(1);
        }
        return true;
    }
}

// 食物类
class Food {
    constructor(game) {
        this.game = game;
        this.position = { x: 0, y: 0 };
        this.randomize();
    }

    randomize() {
        do {
            this.position = {
                x: Math.floor(Math.random() * (this.game.width / this.game.blockSize)) * this.game.blockSize,
                y: Math.floor(Math.random() * (this.game.height / this.game.blockSize)) * this.game.blockSize
            };
        } while (
            this.game.snake.positions.some(pos => 
                pos.x === this.position.x && pos.y === this.position.y
            ) ||
            this.game.obstacles.positions.some(pos => 
                pos.x === this.position.x && pos.y === this.position.y
            )
        );
    }

    draw() {
        this.game.ctx.fillStyle = COLORS.FOOD;
        this.game.ctx.fillRect(
            this.position.x, this.position.y,
            this.game.blockSize, this.game.blockSize
        );
    }
}

// 障碍物类
class Obstacles {
    constructor(game) {
        this.game = game;
        this.positions = [];
    }

    initialize(mode) {
        this.positions = [];
        if (mode === 'maze') {
            this.generateMaze();
        } else {
            this.generateRandom();
        }
    }

    generateRandom() {
        const count = 60;  // 随机模式的障碍物数量
        for (let i = 0; i < count; i++) {
            this.addSingleRandom();
        }
    }

    generateMaze() {
        // 创建二维数组表示迷宫，1表示墙，0表示通道
        const grid = Array(Math.floor(this.game.height / this.game.blockSize))
            .fill()
            .map(() => Array(Math.floor(this.game.width / this.game.blockSize)).fill(1));

        const carvePassage = (x, y) => {
            grid[y][x] = 0;  // 将当前位置设为通道

            // 定义四个方向：上、右、下、左
            const directions = [
                [0, -2], [2, 0], [0, 2], [-2, 0]
            ];
            
            // 随机打乱方向
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }

            // 向四个方向尝试开辟通道
            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;

                if (newX > 0 && newX < grid[0].length - 1 && 
                    newY > 0 && newY < grid.length - 1 && 
                    grid[newY][newX] === 1) {
                    // 把中间的格子也变成通道
                    grid[y + dy/2][x + dx/2] = 0;
                    carvePassage(newX, newY);
                }
            }
        };

        // 从中心开始生成迷宫
        const startX = Math.floor(grid[0].length / 2);
        const startY = Math.floor(grid.length / 2);
        carvePassage(startX, startY);

        // 将墙转换为障碍物位置
        this.positions = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[y][x] === 1) {
                    this.positions.push({
                        x: x * this.game.blockSize,
                        y: y * this.game.blockSize
                    });
                }
            }
        }

        // 确保蛇的初始位置和周围区域是空的
        const centerX = Math.floor(this.game.width / 2);
        const centerY = Math.floor(this.game.height / 2);
        const clearArea = [
            {x: centerX, y: centerY},
            {x: centerX - this.game.blockSize, y: centerY},
            {x: centerX + this.game.blockSize, y: centerY},
            {x: centerX, y: centerY - this.game.blockSize},
            {x: centerX, y: centerY + this.game.blockSize}
        ];

        this.positions = this.positions.filter(pos => 
            !clearArea.some(clear => 
                clear.x === pos.x && clear.y === pos.y
            )
        );
    }

    addRandom() {
        const count = Math.floor(Math.random() * 11) + 10;  // 10-20个
        for (let i = 0; i < count; i++) {
            this.addSingleRandom();
        }
    }

    addSingleRandom() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const pos = {
                x: Math.floor(Math.random() * (this.game.width / this.game.blockSize)) * this.game.blockSize,
                y: Math.floor(Math.random() * (this.game.height / this.game.blockSize)) * this.game.blockSize
            };

            const snakeHead = this.game.snake.positions[0];
            if (Math.abs(pos.x - snakeHead.x) <= this.game.blockSize &&
                Math.abs(pos.y - snakeHead.y) <= this.game.blockSize) {
                continue;
            }

            if (!this.positions.some(p => p.x === pos.x && p.y === pos.y) &&
                !this.game.snake.positions.some(p => p.x === pos.x && p.y === pos.y) &&
                !(this.game.food.position.x === pos.x && this.game.food.position.y === pos.y)) {
                this.positions.push(pos);
                break;
            }
        }
    }

    draw() {
        this.game.ctx.fillStyle = COLORS.OBSTACLE;
        this.positions.forEach(pos => {
            this.game.ctx.fillRect(
                pos.x, pos.y,
                this.game.blockSize, this.game.blockSize
            );
        });
    }
}

// 游戏类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.blockSize = 20;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 初始化组件但不开始游戏
        this.obstacles = new Obstacles(this);
        this.snake = new Snake(this);
        this.food = new Food(this);
        
        // 初始状态
        this.score = 0;
        this.autoMode = true;
        this.gameOver = false;
        this.gameStarted = false;  // 添加新的状态标志

        // 添加速度控制相关属性
        this.frameCount = 0;
        this.updateInterval = 10;  // 每10帧更新一次，数字越大速度越慢

        this.setupControls();
        this.showModeSelection();  // 直接显示模式选择界面
    }

    setupControls() {
        document.getElementById('modeSelect').onclick = () => {
            this.gameStarted = false;  // 重置游戏状态
            this.showModeSelection();
        };
        document.getElementById('addObstacles').onclick = () => {
            if (!this.gameOver) {
                this.obstacles.addRandom();
                if (!this.snake.findPathToFood()) {
                    this.gameOver = true;
                }
            }
        };
        document.getElementById('toggleAuto').onclick = () => {
            this.autoMode = !this.autoMode;
            this.snake.path = [];
        };

        document.addEventListener('keydown', (e) => {
            if (!this.autoMode && !this.gameOver) {
                switch(e.key) {
                    case 'ArrowUp': this.snake.setDirection(0, -1); break;
                    case 'ArrowDown': this.snake.setDirection(0, 1); break;
                    case 'ArrowLeft': this.snake.setDirection(-1, 0); break;
                    case 'ArrowRight': this.snake.setDirection(1, 0); break;
                }
            }
            if (e.key === ' ' && this.gameOver) {
                this.reset();
            }
        });
    }

    showModeSelection() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('选择游戏模式', this.width/2, this.height/3);
        
        // 绘制选择按钮
        const drawButton = (text, y, selected) => {
            this.ctx.fillStyle = selected ? '#4CAF50' : '#ddd';
            this.ctx.fillRect(this.width/4, y, this.width/2, 50);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(text, this.width/2, y + 35);
        };

        drawButton('迷宫模式', this.height/2 - 60, false);
        drawButton('随机模式', this.height/2 + 60, false);

        const handleClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (x >= this.width/4 && x <= this.width*3/4) {
                if (y >= this.height/2 - 60 && y <= this.height/2 - 10) {
                    this.startGame('maze');
                    this.canvas.removeEventListener('click', handleClick);
                } else if (y >= this.height/2 + 60 && y <= this.height/2 + 110) {
                    this.startGame('random');
                    this.canvas.removeEventListener('click', handleClick);
                }
            }
        };

        this.canvas.addEventListener('click', handleClick);
    }

    startGame(mode) {
        this.reset();
        this.obstacles.initialize(mode);
        this.gameOver = false;
        this.gameStarted = true;  // 标记游戏已开始
    }

    reset() {
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;  // 重置时也重置游戏状态
        this.snake.reset();
        this.food.randomize();
        this.snake.path = [];
    }

    checkCollision() {
        const head = this.snake.positions[0];
        if (head.x === this.food.position.x && head.y === this.food.position.y) {
            this.snake.length++;
            this.score++;
            this.food.randomize();
            this.snake.path = [];
            return true;
        }
        return false;
    }

    update() {
        if (!this.gameStarted) {
            return;
        }

        // 增加帧计数
        this.frameCount++;

        // 只在特定帧数时更新游戏状态
        if (this.frameCount % this.updateInterval !== 0) {
            this.draw();  // 仍然每帧都绘制
            return;
        }

        if (this.gameOver) {
            if (this.score > 0 || this.snake.positions.length > 1) {
                this.ctx.fillStyle = '#000';
                this.ctx.font = '30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('游戏结束! 按空格键重新开始', this.width/2, this.height/2);
            }
            return;
        }

        if (this.autoMode) {
            if (!this.snake.autoMove()) {
                this.gameOver = true;
                return;
            }
        }

        if (!this.snake.update()) {
            this.gameOver = true;
            return;
        }

        this.checkCollision();
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.obstacles.draw();
        this.food.draw();
        this.snake.draw();
        
        document.getElementById('score').textContent = `分数: ${this.score}`;
    }
}

// 启动游戏
const game = new Game();
function gameLoop() {
    game.update();
    requestAnimationFrame(gameLoop);
}
gameLoop(); 