/* ============================================
   STACKFLOW - GAME LOGIC
   Vanilla JavaScript
   ============================================ */

class StackFlowGame {
    constructor() {
        // Game constants
        this.GAME_TIME = 60;
        this.CORRECT_POINTS = 10;
        this.INCORRECT_POINTS = -5;
        this.TIME_BONUS_THRESHOLD = 30;
        this.TIME_BONUS_POINTS = 20;

        // Game state
        this.score = 0;
        this.timeRemaining = this.GAME_TIME;
        this.gameActive = true;
        this.connections = [];
        this.correctConnections = 0;
        this.totalRequiredConnections = 6;

        // Dragging state
        this.isDragging = false;
        this.dragStartNode = null;
        this.dragLine = null;

        // DOM elements
        this.gameBoard = document.getElementById('gameBoard');
        this.nodesContainer = document.getElementById('nodesContainer');
        this.canvas = document.getElementById('connectionsCanvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.timerDisplay = document.getElementById('timer');
        this.scoreDisplay = document.getElementById('score');
        this.restartBtn = document.getElementById('restartBtn');
        this.correctCountDisplay = document.getElementById('correctCount');
        this.timeBonusDisplay = document.getElementById('timeBonus');

        // Modal elements
        this.successModal = document.getElementById('successModal');
        this.failureModal = document.getElementById('failureModal');
        this.successOverlay = document.getElementById('successOverlay');
        this.failureOverlay = document.getElementById('failureOverlay');

        // Tooltip
        this.tooltip = document.getElementById('tooltip');

        // Define node data
        this.nodes = [
            {
                id: 'loadbalancer',
                label: 'Load Balancer',
                x: 50,
                y: 60,
                description: 'Distributes incoming traffic across servers',
                color: '#5C4033'
            },
            {
                id: 'frontend',
                label: 'Frontend',
                x: 50,
                y: 180,
                description: 'User interface and client-side logic',
                color: '#5C4033'
            },
            {
                id: 'apiserver',
                label: 'API Server',
                x: 50,
                y: 300,
                description: 'Core business logic and routing',
                color: '#5C4033'
            },
            {
                id: 'database',
                label: 'Database',
                x: 50,
                y: 420,
                description: 'Persistent data storage',
                color: '#5C4033'
            },
            {
                id: 'auth',
                label: 'Auth Service',
                x: 350,
                y: 300,
                description: 'User authentication and authorization',
                color: '#5C4033'
            },
            {
                id: 'cache',
                label: 'Cache',
                x: 650,
                y: 300,
                description: 'Fast data retrieval layer',
                color: '#5C4033'
            }
        ];

        // Define correct connections: [source, target]
        this.correctConnectionsMap = [
            ['loadbalancer', 'frontend'],
            ['frontend', 'apiserver'],
            ['apiserver', 'database'],
            ['apiserver', 'auth'],
            ['apiserver', 'cache'],
            ['loadbalancer', 'apiserver']
        ];

        this.init();
    }

    init() {
        this.setupCanvas();
        this.createNodes();
        this.setupEventListeners();
        this.startTimer();
        this.updateUI();
    }

    setupCanvas() {
        const rect = this.gameBoard.getBoundingClientRect();
        this.canvas.width = this.gameBoard.offsetWidth;
        this.canvas.height = this.gameBoard.offsetHeight;
    }

    createNodes() {
        this.nodes.forEach(nodeData => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'node';
            nodeEl.id = `node-${nodeData.id}`;
            nodeEl.dataset.nodeId = nodeData.id;
            nodeEl.innerHTML = `
                <span class="node-label">${nodeData.label}</span>
            `;

            // Position calculation for responsive layout
            const boardWidth = this.gameBoard.offsetWidth;
            const boardHeight = this.gameBoard.offsetHeight;
            const x = (nodeData.x / 800) * boardWidth;
            const y = (nodeData.y / 520) * boardHeight;

            nodeEl.style.left = x + 'px';
            nodeEl.style.top = y + 'px';

            nodeEl.addEventListener('mousedown', (e) => this.startDrag(e, nodeData));
            nodeEl.addEventListener('mouseup', (e) => this.endDrag(e, nodeData));
            nodeEl.addEventListener('mouseenter', (e) => this.showTooltip(e, nodeData));
            nodeEl.addEventListener('mouseleave', () => this.hideTooltip());

            // Touch support
            nodeEl.addEventListener('touchstart', (e) => this.startDrag(e, nodeData));
            nodeEl.addEventListener('touchend', (e) => this.endDrag(e, nodeData));

            this.nodesContainer.appendChild(nodeEl);
        });
    }

    startDrag(e, nodeData) {
        if (e.type.includes('touch')) {
            e.preventDefault();
        }

        if (!this.gameActive) return;

        this.isDragging = true;
        this.dragStartNode = nodeData;

        const nodeEl = document.getElementById(`node-${nodeData.id}`);
        nodeEl.classList.add('dragging');

        document.addEventListener('mousemove', (e) => this.drawConnection(e));
        document.addEventListener('touchmove', (e) => this.drawConnection(e), { passive: false });
    }

    drawConnection(e) {
        if (!this.isDragging || !this.dragStartNode) return;

        const boardRect = this.gameBoard.getBoundingClientRect();
        let clientX, clientY;

        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x1 = this.dragStartNode.x + 60; // Center of node
        const y1 = this.dragStartNode.y + 25;
        const x2 = clientX - boardRect.left;
        const y2 = clientY - boardRect.top;

        // Redraw canvas
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.redrawConnections();

        // Draw temporary connection line
        this.canvasCtx.strokeStyle = '#7B5E57';
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.lineCap = 'round';
        this.canvasCtx.lineJoin = 'round';
        this.canvasCtx.setLineDash([5, 5]);
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(x1, y1);
        this.canvasCtx.lineTo(x2, y2);
        this.canvasCtx.stroke();
        this.canvasCtx.setLineDash([]);
    }

    endDrag(e, targetNodeData) {
        if (!this.isDragging) return;

        const nodeEl = document.getElementById(`node-${this.dragStartNode.id}`);
        nodeEl.classList.remove('dragging');

        if (this.dragStartNode.id !== targetNodeData.id) {
            this.createConnection(this.dragStartNode, targetNodeData);
        }

        this.isDragging = false;
        this.dragStartNode = null;

        document.removeEventListener('mousemove', (e) => this.drawConnection(e));
        document.removeEventListener('touchmove', (e) => this.drawConnection(e));

        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.redrawConnections();
    }

    createConnection(sourceNode, targetNode) {
        // Check if connection already exists (in either direction)
        const connectionExists = this.connections.some(conn => {
            return (conn.source.id === sourceNode.id && conn.target.id === targetNode.id) ||
                   (conn.source.id === targetNode.id && conn.target.id === sourceNode.id);
        });

        if (connectionExists) {
            this.showErrorAnimation(sourceNode, targetNode);
            return;
        }

        // Check if connection is correct
        const isCorrect = this.correctConnectionsMap.some(pair => {
            return (pair[0] === sourceNode.id && pair[1] === targetNode.id);
        });

        const connection = {
            source: sourceNode,
            target: targetNode,
            isCorrect: isCorrect
        };

        this.connections.push(connection);

        if (isCorrect) {
            this.score += this.CORRECT_POINTS;
            this.correctConnections++;
            this.showSuccessAnimation(sourceNode, targetNode);
        } else {
            this.score += this.INCORRECT_POINTS;
            this.score = Math.max(0, this.score);
            this.showErrorAnimation(sourceNode, targetNode);
        }

        this.updateUI();
        this.checkGameCompletion();
        this.redrawConnections();
    }

    redrawConnections() {
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.connections.forEach(conn => {
            const x1 = conn.source.x + 60;
            const y1 = conn.source.y + 25;
            const x2 = conn.target.x + 60;
            const y2 = conn.target.y + 25;

            this.canvasCtx.strokeStyle = conn.isCorrect ? '#2E7D32' : '#C62828';
            this.canvasCtx.lineWidth = conn.isCorrect ? 3 : 2;
            this.canvasCtx.lineCap = 'round';
            this.canvasCtx.lineJoin = 'round';
            this.canvasCtx.globalAlpha = conn.isCorrect ? 1 : 0.6;

            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(x1, y1);
            this.canvasCtx.lineTo(x2, y2);
            this.canvasCtx.stroke();

            this.canvasCtx.globalAlpha = 1;

            // Draw arrow at end of line
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const arrowSize = 8;
            this.canvasCtx.fillStyle = conn.isCorrect ? '#2E7D32' : '#C62828';
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(x2, y2);
            this.canvasCtx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
            this.canvasCtx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
            this.canvasCtx.fill();
        });
    }

    showSuccessAnimation(sourceNode, targetNode) {
        const sourceEl = document.getElementById(`node-${sourceNode.id}`);
        const targetEl = document.getElementById(`node-${targetNode.id}`);

        sourceEl.classList.add('correct');
        targetEl.classList.add('correct');

        // Remove animation class after animation completes
        setTimeout(() => {
            sourceEl.classList.remove('correct');
            targetEl.classList.remove('correct');
        }, 1000);
    }

    showErrorAnimation(sourceNode, targetNode) {
        const sourceEl = document.getElementById(`node-${sourceNode.id}`);
        sourceEl.style.animation = 'none';
        setTimeout(() => {
            sourceEl.style.animation = 'shake 0.4s ease-in-out';
        }, 10);

        setTimeout(() => {
            sourceEl.style.animation = 'none';
        }, 410);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.gameActive) return;

            this.timeRemaining--;
            this.updateUI();

            if (this.timeRemaining <= 10) {
                this.timerDisplay.classList.add('warning');
            }

            if (this.timeRemaining <= 0) {
                this.endGame(false);
            }
        }, 1000);
    }

    checkGameCompletion() {
        if (this.correctConnections === this.totalRequiredConnections) {
            this.endGame(true);
        }
    }

    endGame(success) {
        this.gameActive = false;
        clearInterval(this.timerInterval);

        if (success) {
            // Add time bonus
            if (this.timeRemaining > this.TIME_BONUS_THRESHOLD) {
                this.score += this.TIME_BONUS_POINTS;
            }

            this.showSuccessModal();
        } else {
            this.showFailureModal();
        }
    }

    showSuccessModal() {
        document.getElementById('finalScore').textContent = this.score;
        this.successModal.classList.add('active');
    }

    showFailureModal() {
        document.getElementById('failureScore').textContent = this.score;
        this.failureModal.classList.add('active');
    }

    showTooltip(e, nodeData) {
        const rect = e.target.getBoundingClientRect();
        this.tooltip.classList.add('active');
        this.tooltip.style.left = rect.left + window.scrollX + 'px';
        this.tooltip.style.top = (rect.top + window.scrollY - 60) + 'px';

        document.getElementById('tooltipTitle').textContent = nodeData.label;
        document.getElementById('tooltipContent').textContent = nodeData.description;
    }

    hideTooltip() {
        this.tooltip.classList.remove('active');
    }

    updateUI() {
        this.timerDisplay.textContent = this.timeRemaining;
        this.scoreDisplay.textContent = this.score;
        this.correctCountDisplay.textContent = `${this.correctConnections}/${this.totalRequiredConnections}`;

        // Update time bonus display
        if (this.timeRemaining > this.TIME_BONUS_THRESHOLD) {
            this.timeBonusDisplay.textContent = '+20';
            this.timeBonusDisplay.style.color = '#2E7D32';
        } else if (this.timeRemaining <= 0) {
            this.timeBonusDisplay.textContent = '+0';
            this.timeBonusDisplay.style.color = '#C62828';
        } else {
            this.timeBonusDisplay.textContent = '+0';
            this.timeBonusDisplay.style.color = '#999';
        }
    }

    setupEventListeners() {
        this.restartBtn.addEventListener('click', () => this.restart());
        document.getElementById('successRestartBtn').addEventListener('click', () => this.restart());
        document.getElementById('failureRestartBtn').addEventListener('click', () => this.restart());
        this.successOverlay.addEventListener('click', () => this.restart());
        this.failureOverlay.addEventListener('click', () => this.restart());
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.timeRemaining = this.GAME_TIME;
        this.gameActive = true;
        this.connections = [];
        this.correctConnections = 0;

        // Clear modals
        this.successModal.classList.remove('active');
        this.failureModal.classList.remove('active');

        // Clear canvas
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Reset timer display
        this.timerDisplay.classList.remove('warning');

        // Reset node styles
        document.querySelectorAll('.node').forEach(node => {
            node.classList.remove('correct', 'dragging');
            node.style.animation = 'none';
        });

        // Update UI and restart timer
        this.updateUI();
        clearInterval(this.timerInterval);
        this.startTimer();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StackFlowGame();
});