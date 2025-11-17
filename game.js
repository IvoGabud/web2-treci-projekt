//glavni objekti igre
let canvas;
let ctx;

let ball;
let paddle;
let bricks = [];

//stanje i rezultati igre
let gameState = 'START';
let score = 0;
let highScore = 0;

//kontrole
let rightPressed = false;
let leftPressed = false;


//poostavljanje canvasa, high scorea i pocetak igre
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    loadHighScore();

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    gameLoop();
}

//ucitavanje high scorea iz local storagea
function loadHighScore() {
    const saved = localStorage.getItem('highScore');
    if (saved) {
        highScore = parseInt(saved, 10);
    }
}

//spremanje high scorea u local storage
function saveHighScore() {
    localStorage.setItem('highScore', highScore.toString());
}

//obrada pritisaka tipke
function keyDownHandler(e) {
    if (e.code === 'Space' && gameState === 'START') {
        startGame();
    }

    if (e.code === 'Space' && (gameState === 'GAME_OVER' || gameState === 'WIN')) {
        gameState = 'START';
    }

    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        rightPressed = true;
    }

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        leftPressed = true;
    }
}

//obrada otpusta tipke
function keyUpHandler(e) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        rightPressed = false;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        leftPressed = false;
    }
}

//postavljanje pocetnog stanja igre
function startGame() {
    gameState = 'PLAYING';
    score = 0;

    paddle = {
        x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: CANVAS_HEIGHT - 30,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
    };

    //odabir pocetnog smjera: lijevo ili desno
    let direction;    
        if (Math.random() < 0.5) {
            direction = -1;
        } else {
            direction = 1;
        }

    ball = {
        x: paddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
        y: paddle.y - BALL_SIZE,
        size: BALL_SIZE,
        dx: direction * INITIAL_BALL_SPEED * Math.cos(Math.PI / 4),
        dy: -INITIAL_BALL_SPEED * Math.sin(Math.PI / 4),
        speed: INITIAL_BALL_SPEED
    };

    createBricks();
}

//napuni niz cigli na pocetku igre
function createBricks() {
    bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            bricks.push({
                x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING_HORIZONTAL),
                y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING_VERTICAL),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: BRICK_COLORS[row],
                alive: true
            });
        }
    }
}

//glavna petlja igre
function gameLoop() {
    //ocisti canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState === 'START') {
        drawStartScreen();
    } else if (gameState === 'PLAYING') {
        update();
        draw();
    } else if (gameState === 'GAME_OVER') {
        draw();
        drawGameOver();
    } else if (gameState === 'WIN') {
        draw();
        drawWin();
    }

    //ostvaruje rekurzivni poziv za sljedeci frame
    requestAnimationFrame(gameLoop);
}

//azuriranje pozicija i logika igre
function update() {

    //pomicanje palice
    if (rightPressed && paddle.x + paddle.width < CANVAS_WIDTH) {
        paddle.x += PADDLE_SPEED;
    }
    if (leftPressed && paddle.x > 0) {
        paddle.x -= PADDLE_SPEED;
    }

    //pomicanje lopte
    ball.x += ball.dx;
    ball.y += ball.dy;

    //detekcija sudara loptice sa zidom
    if (ball.x <= 0 || ball.x + ball.size >= CANVAS_WIDTH) {
        ball.dx = -ball.dx;
    }

    if (ball.y <= 0) {
        ball.dy = -ball.dy;
    }

    //detekcija sudara loptice sa palicom
    if (ball.y + ball.size >= paddle.y &&
        ball.y + ball.size <= paddle.y + paddle.height &&
        ball.x + ball.size >= paddle.x &&
        ball.x <= paddle.x + paddle.width) {

        ball.dy = -Math.abs(ball.dy);

        //horizontalna brzina ovisna o tome koliko blizu centra palice je loptica udarila
        const hitPos = (ball.x + ball.size / 2 - paddle.x) / paddle.width;
        ball.dx = (hitPos - 0.5) * ball.speed * 2;
    }

    checkBrickCollision();

    //gubitak igre
    if (ball.y > CANVAS_HEIGHT) {
        gameState = 'GAME_OVER';
        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
    }

    //pobjeda igre
    const remainingBricks = bricks.filter(b => b.alive).length;
    if (remainingBricks === 0) {
        gameState = 'WIN';

        if (score > highScore) {
            highScore = score;
            saveHighScore();
        }
    }
}


//kolizija loptice i cigli
function checkBrickCollision() {

    for (let brick of bricks) {
        if (!brick.alive) continue;

        if (ball.x + ball.size >= brick.x &&
            ball.x <= brick.x + brick.width &&
            ball.y + ball.size >= brick.y &&
            ball.y <= brick.y + brick.height) {

            brick.alive = false;

            score++;

            //izracunaj hor. i vert. udaljenost izmedu centara loptice i centra cigle
            const ballCenterX = ball.x + ball.size / 2;
            const ballCenterY = ball.y + ball.size / 2;
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;

            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;

            //provjeri treba li se loptica odbiti horizontalno ili vertikalno
            if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
                ball.dx = -ball.dx;

                //povecaj brzinu loptice ako je udarila u kut cigle
                if (Math.abs(dx / brick.width) > 0.4 && Math.abs(dy / brick.height) > 0.4) {
                    ball.speed *= 1.03;
                    //ažuriraj dx i dy komponente brzine
                    const angle = Math.atan2(ball.dy, ball.dx);
                    ball.dx = ball.speed * Math.cos(angle);
                    ball.dy = ball.speed * Math.sin(angle);
                }
            } else {
                ball.dy = -ball.dy;

                //povecaj brzinu loptice ako je udarila u kut cigle
                if (Math.abs(dx / brick.width) > 0.4 && Math.abs(dy / brick.height) > 0.4) {
                    ball.speed *= 1.03;
                    //ažuriraj dx i dy komponente brzine
                    const angle = Math.atan2(ball.dy, ball.dx);
                    ball.dx = ball.speed * Math.cos(angle);
                    ball.dy = ball.speed * Math.sin(angle);
                }
            }

            break;
        }
    }
}

//crtanje svih elemenata igre
function draw() {
    drawScore();
    drawBricks();
    drawPaddle();
    drawBall();
}

function drawScore() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Helvetica, Verdana';

    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 20, 20);

    ctx.textAlign = 'right';
    ctx.fillText('BEST: ' + highScore, CANVAS_WIDTH - 100, 20);
}

function drawBricks() {
    for (let brick of bricks) {
        if (!brick.alive) continue;

        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(brick.x, brick.y + brick.height);
        ctx.lineTo(brick.x, brick.y);
        ctx.lineTo(brick.x + brick.width, brick.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.width, brick.y);
        ctx.lineTo(brick.x + brick.width, brick.y + brick.height);
        ctx.lineTo(brick.x, brick.y + brick.height);
        ctx.stroke();
    }
}

function drawPaddle() {
    ctx.fillStyle = '#DDDDDD';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddle.x, paddle.y + paddle.height);
    ctx.lineTo(paddle.x, paddle.y);
    ctx.lineTo(paddle.x + paddle.width, paddle.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(paddle.x + paddle.width, paddle.y);
    ctx.lineTo(paddle.x + paddle.width, paddle.y + paddle.height);
    ctx.lineTo(paddle.x, paddle.y + paddle.height);
    ctx.stroke();
}

function drawBall() {

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);


    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y + ball.size);
    ctx.lineTo(ball.x, ball.y);
    ctx.lineTo(ball.x + ball.size, ball.y);
    ctx.stroke();


    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.beginPath();
    ctx.moveTo(ball.x + ball.size, ball.y);
    ctx.lineTo(ball.x + ball.size, ball.y + ball.size);
    ctx.lineTo(ball.x, ball.y + ball.size);
    ctx.stroke();
}

function drawStartScreen() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Helvetica, Verdana';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BREAKOUT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.font = 'bold italic 18px Helvetica, Verdana';
    ctx.fillText('Press SPACE to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 37);
}

function drawGameOver() {
    ctx.fillStyle = '#FFFF00';
    ctx.font = 'bold 40px Helvetica, Verdana';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);


    ctx.font = 'bold 20px Helvetica, Verdana';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Final Score: ' + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    ctx.font = 'bold italic 18px Helvetica, Verdana';
    ctx.fillText('Press SPACE to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 75);
}

function drawWin() {
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 40px Helvetica, Verdana';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);


    ctx.font = 'bold 20px Helvetica, Verdana';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Perfect Score: ' + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    ctx.font = 'bold italic 18px Helvetica, Verdana';
    ctx.fillText('Press SPACE to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 75);
}

window.addEventListener('load', init);
