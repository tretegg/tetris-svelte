<script lang="ts">
    import { TetrisClient, type Piece, type Shape, type nextPieces, type heldPiece, type Player, type keybinds, type Rooms, type Room } from "$lib/client/client";
    import { onMount } from "svelte";
    import NextPiece from "$lib/nextPiece.svelte";
    import HeldPiece from "$lib/heldPiece.svelte";
    import OtherPlayers from "$lib/board.svelte";
    import GameModeSelector from "$lib/gameModeSelector.svelte";
    import Settings from "$lib/settings.svelte";
    import Browser from "$lib/browser.svelte";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 40;
    let score = 0;
    let level = 1;
    let heldTetromino: heldPiece | undefined;
    let nextPiece: nextPieces[] =[];
    let totalClears = 0;
    let time = 0;
    let clock: string = "00:00";
    let showSettings: boolean = false

    // Used to prevent the player from swapping infinitely
    let canSwap = true;

    let otherPlayers: {[id: string]: Player} = {}
    
    const SHAPES: Shape[] = [
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ],
        [
            [0, 1, 1],
            [1, 1, 0]
        ],
        [
            [1, 0, 0],
            [1, 1, 1]
        ],
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0]
        ],
        [
            [1, 1],
            [1, 1]
        ],
        [
            [0, 0, 1],
            [1, 1, 1]
        ],
        [
            [1, 1, 0],
            [0, 1, 1]
        ]
    ];

    const COLORS = [
        "#ffdb00",
        "#00ff92",
        "#ff0000",
        "#0092ff",
        "#4900ff",
        "#49ff00",
        "#ff00db"
    ]

    let availableShapes: boolean[];
    
    let pieces: Piece[];
    
    let speed = 1;

    let grid: number[][] = new Array(20).fill(0).map(() => new Array(10).fill(0));

    let client: TetrisClient;
    let username: string

    type cell = {
        x: number,
        y: number,
        color: string
    }

    let binds: keybinds = {
        left: "a",
        right: "d",
        softDrop: "s",
        rotateClockwise: "ArrowRight",
        rotateCounterClockwise: "ArrowLeft",
        hardDrop: " ",
        hold: "c"
    }
    let rooms: Rooms
    let currentRoom: Room

    onMount(() => {
        if (!canvas) {
            console.error("Canvas element is not found!");
            return;
        }

        
        availableShapes = Array(SHAPES.length).fill(true);
        pieces = [];

        canvas.width = 400;
        canvas.height = 800;

        ctx = canvas.getContext("2d")!;
        ctx.scale(CELLSIZE, CELLSIZE);

        setInterval(draw, 1000 / 60);
        setInterval(lower, 1000 / speed);
        // setInterval(log, 1000)

        client = new TetrisClient()

        client.hookClientEvent("PLAYER_UPDATE", (players: {[id:string]:Player}) => {
            otherPlayers = players
        })

        client.hookClientEvent("ROOMS", (roomsData: Rooms) => { 
            rooms = roomsData
        })

        client.hookClientEvent("ROOM_JOINED", (room: Room) => {
            currentRoom = room
            browsing = false

            startGame()
        })
    });

    function log () {
        pieces.forEach(element => {
            if (!element.grounded) {
                console.log(element)
            }
            
        });
    }

    function draw() {
        ctx.clearRect(0, 0, 400, 800); // Clear the canvas
        drawGrid(CELLSIZE); // Draw the grid with 40px cells

        pieces.forEach((element) => {
            // For each piece in the pieces array
            element.shape.forEach((row, rowIndex) => {
                // For each row of the piece
                row.forEach((cell, colIndex) => {
                    // For each cell in the row
                    if (cell === 1) {
                        // Set the fill color for the piece
                        ctx.fillStyle = element.color;

                        // Fill the rectangle (the block in the piece)
                        ctx.fillRect(
                            element.x + colIndex, 
                            element.y + rowIndex, 
                            1, 1
                        );

                        // Set the outline color (adjusted) and line width for the inner outline
                        ctx.strokeStyle = adjust(element.color, -30); // Outline color adjusted
                        ctx.lineWidth = 0.1; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            element.x + colIndex + 0.05,  // Slightly shift right
                            element.y + rowIndex + 0.05,   // Slightly shift down
                            1 - 0.1,  // Shrink the width and height for the outline to appear inside
                            1 - 0.1    // Shrink the width and height for the outline to appear inside
                        );
                    }
                });
            });
        });

        updateGrid();

        clearLines();
    }

    function updateGrid() {
        grid = new Array(20).fill(0).map(() => new Array(10).fill(0));
        for (const piece of pieces) {
            if (!piece.grounded) continue;

            for (let row = 0; row < piece.shape.length; row++) {
                for (let col = 0; col < piece.shape[row].length; col++) {
                    const cell = piece.shape[row][col];
                    const x = piece.x + col;
                    const y = piece.y + row;
                    // Bounds check
                    if (cell === 1 && y >= 0 && y < 20 && x >= 0 && x < 10) {
                        grid[y][x] = 1;
                    }
                }
            }
        };
        if (client) client.updateGrid(grid)
    }

    function clearLines() {

        let clearedLines: number[] = [];

        // Check for full rows and mark them for clearing
        for (let row = 0; row < grid.length; row++) {
            if (isRowFull(grid[row])) {
                // console.log("row full", row)
                clearedLines.push(row);
            }
        }

        if (clearedLines.length <= 0) return;

        clearedLines.forEach(line => {
            // Remove the line
            grid.splice(line, 1);
            // Add a new empty row to the top
            grid.unshift(new Array(10).fill(0));
            
            for(const piece of pieces) {
                // Check if the piece is grounded
                if (piece.grounded) {
                    let piecePartCleared = false;
                    let pieceWidth = piece.shape[0].length;
                    
                    // For each row of the piece
                    for (let row = 0; row < piece.shape.length; row++) {
                        // If it's in the same row as the cleared line
                        if ((piece.y + row) === line) {
                            // getGerby()

                            // Remove it from the pieces shape
                            piece.shape.splice(row, 1);

                            piecePartCleared = true;
                            
                            
                            // Add a new empty row to the top
                            piece.shape.unshift(new Array(pieceWidth).fill(0));
                            // console.table(piece.shape)
                            break;
                        }
                    }
                    
                    // we automated deuterium yesterday on dyson sphere just a little fyi btw
                    // If the piece was higher than the cleared line but had no part cleared
                    if (!piecePartCleared && getLowestPieceY(piece) < line) {
                        piece.y++;
                    }
                }
            };
        });
        
        updateScore(clearedLines.length);

        updateGrid();
    }

    function updateScore(clearedLines: number) {
        if (clearedLines > 0) {
            if (clearedLines === 1) {
                score += 100 * level;
            } else if (clearedLines === 2) {
                score += 300 * level;
            } else if (clearedLines === 3) {
                score += 500 * level;
            } else if (clearedLines === 4) {
                score += 800 * level;
            }
        }
        totalClears += clearedLines
        updateLevel();

        if (client) client.updateScore(score)
    }

    function updateLevel() {
        level = Math.floor(totalClears / 10) + 1;
        speed = level * 1.2;
    }

    function getLowestPieceY(piece: Piece): number {
        //Bottom y value
        let bottomY = 0;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1) {
                    bottomY = Math.max(bottomY, row);
                }
            }
        }
        bottomY += piece.y;

        return bottomY
    }

    function isRowFull(row: number[]): boolean {
        return row.every(cell => cell === 1);
    }

    // Allows you to lighten or darken a color
    function adjust(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    function lower() {
        pieces.forEach((element) => {
            if (!element.grounded) {
                if (!collision(element, "down")) {
                    element.y++;
                } else {
                    element.grounded = true;
                }
            }
        });

        if (client) client.syncWithServer()
    }

    function drawGrid(cellSize: number) {
        ctx.save(); // Save the current state of the canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transform to draw the grid accurately

        ctx.strokeStyle = "grey";
        ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = 0; x <= 400; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 800);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= 800; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(400, y);
            ctx.stroke();
        }

        ctx.restore(); // Restore the canvas state
    }

    function newPiece() {
        canSwap = true;
        // Validate SHAPES and canvas dimensions
        if (!SHAPES || SHAPES.length === 0) {
            console.error("SHAPES array is empty or not defined");
            return;
        }

        if (!canvas || !canvas.width) {
            console.error("Canvas is not properly initialized");
            return;
        }

        let available = false;
        let randomIndex = 0;
        let shape: Shape;

        while (nextPiece.length <= 3) {
            while (!available) {
                randomIndex = Math.floor(Math.random() * SHAPES.length);
                if (availableShapes[randomIndex]) {
                    available = true;
                }
            }
            availableShapes[randomIndex] = false;

            // Reset availableShapes if all shapes are used
            if (availableShapes.every((available) => !available)) {
                availableShapes = Array(SHAPES.length).fill(true);
            }
            // Create a deep copy of the selected shape
            shape = SHAPES[randomIndex].map(row => [...row]);
            nextPiece.push({
                shape: shape,
                color: COLORS[randomIndex],
                pieceID: randomIndex       
            });
            available = false;
        }

        // Align piece placement with grid size
        pieces.push({
            x: Math.floor((canvas.width / CELLSIZE - nextPiece[0].shape[0].length) / 2), // Adjust for grid width
            y: 0,
            color: nextPiece[0].color,
            shape: nextPiece[0].shape,
            grounded: false,
            pieceID: nextPiece[0].pieceID
        });

        nextPiece.shift();

        if (client) {
            client.updateNextPieces(nextPiece)
            
            let currentPiece: Piece | undefined

            for (const piece of pieces) {
                if (!piece.grounded) {
                    currentPiece = piece
                    break
                }
            }

            if (!currentPiece) return

            client.updateCurrentPiece(currentPiece)

        }
    }

    function rotateClockwise(matrix: number[][]): number[][] {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[col][rows - 1 - row] = matrix[row][col];
            }
        }
        return rotated;
    }

    function rotateCounterclockwise(matrix: number[][]): number[][] {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[cols - 1 - col][row] = matrix[row][col];
            }
        }
        return rotated;
    }

    function move(key: string) {
        pieces.forEach((element) => {
            if (element.grounded) return;

            if (key === binds.left && !collision(element, "left")) {
                element.x--;
            } else if (key === binds.right && !collision(element, "right")) {
                element.x++;
            } else if (key === binds.softDrop && !collision(element, "down")) {
                element.y++;
            } else if (key === binds.rotateClockwise) {
                const rotatedShape = rotateClockwise(element.shape);
                const tempPiece = { ...element, shape: rotatedShape };
                if (!collision(tempPiece)) {
                    element.shape = rotatedShape;
                }
            } else if (key === binds.rotateCounterClockwise) {
                const rotatedShape = rotateCounterclockwise(element.shape);
                const tempPiece = { ...element, shape: rotatedShape };
                if (!collision(tempPiece)) {
                    element.shape = rotatedShape;
                }
            } else if (key === binds.hardDrop) {
                while (!collision(element, "down")) {
                    element.y++;
                }
            } else if (key === "c") {
                swapHeldPiece();
            } else {
                return;
            }
        });
    }

    function swapHeldPiece() {
        // Find the active (non-grounded) piece
        const activePiece = pieces.find(element => !element.grounded);
        if (!activePiece) return;

        if (heldTetromino && canSwap) {
            // Store current piece's properties
            const tempShape = [...activePiece.shape.map(row => [...row])];
            const tempColor = activePiece.color;
            const tempPieceID = activePiece.pieceID;
            
            // Update active piece with held piece properties
            activePiece.shape = [...heldTetromino.shape.map(row => [...row])];
            activePiece.color = heldTetromino.color;
            activePiece.x = Math.floor((canvas.width / CELLSIZE - activePiece.shape[0].length) / 2);
            activePiece.y = 0;
            activePiece.pieceID = heldTetromino.pieceID;

            // Update held piece with stored properties
            heldTetromino.shape = tempShape;
            heldTetromino.color = tempColor;
            heldTetromino.pieceID = tempPieceID;
            canSwap = false;
        } else if (canSwap && !heldTetromino) {
            // If no held piece exists, store current piece and create new piece
            heldTetromino = {
                shape: [...activePiece.shape.map(row => [...row])],
                color: activePiece.color,
                pieceID: activePiece.pieceID
            };
            pieces = pieces.filter(p => p !== activePiece);
            newPiece();
        }
    }

    function collision(piece: Piece, direction?: string): boolean {
        let tempPiece = {
            x: piece.x,
            y: piece.y,
            color: piece.color,
            shape: piece.shape.map(row => [...row]), // copy the shape array
            grounded: piece.grounded
        };
        if (direction === "left") {
            tempPiece.x--;
        } else if (direction === "right") {
            tempPiece.x++;
        } else if (direction === "down") {
            tempPiece.y++;
        }
        // Check for collisions with other pieces
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1) {
                    const x = tempPiece.x + col;
                    const y = tempPiece.y + row;


                    for (const grounded of pieces) {
                        if (grounded.grounded) {
                            for (let gRow = 0; gRow < grounded.shape.length; gRow++) {
                                for (let gCol = 0; gCol < grounded.shape[gRow].length; gCol++) {
                                    const gCell = grounded.shape[gRow][gCol];
                                    if (
                                        gCell === 1 &&
                                        grounded.x + gCol === x &&
                                        grounded.y + gRow === y
                                    ) {
                                        if (direction == "down") piece.grounded = true; 
                                        if (direction == "down") newPiece();
                                        if (piece.y == 0 && direction == "down") {
                                            if (client) client.endSession()
                                            
                                            reset();

                                            return true;
                                        }
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Check grid boundaries

        // Leftmost x value
        let leftmostX = piece.shape[0].length;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1) {
                    leftmostX = Math.min(leftmostX, col); // Update to the smallest column index
                }
            }
        }
        leftmostX = tempPiece.x + leftmostX;

        //Rightmost x value
        let rightmostX = 0;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1) {
                    rightmostX = Math.max(rightmostX, col); // Update to the largest column index
                }
            }
        }
        rightmostX = tempPiece.x + rightmostX;

        //Bottom y value
        let bottomY = 0;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1) {
                    bottomY = Math.max(bottomY, row);
                }
            }
        }
        bottomY += tempPiece.y; // Adjust for the piece's position on the grid

        // console.log("Bottom Y:", bottomY);

        if (leftmostX < 0 || rightmostX >= 400 / CELLSIZE) {
            return true;
        } else if (bottomY >= 800 / CELLSIZE) {
            newPiece();
            piece.grounded = true;
            
            return true;
        }

        return false;
    }

    function getCurrentPiece(): Piece | undefined {
        let currentPiece: Piece;

        for (const piece of pieces) {
            if (!piece.grounded) continue
        
            currentPiece = piece
        
            break
        }

        return currentPiece!
    }

    function validateUsername(username: string): boolean {
        if (!username) return false

        let trimmed = username.trim()

        if (trimmed.length < 3) return false

        if (trimmed.length > 26) return false
        
        return true
    }

    export let canStart: boolean = false

    $: canStart = validateUsername(username)

    let gameOpened: boolean = false
    let browsing: boolean = false
    let gameOver: boolean = false
    let gameMode: "SURVIVAL" | "DEATHMATCH"

    function reset() {
        if (!canStart) return

        pieces = [];
        nextPiece = [];
        heldTetromino = undefined;
        grid = new Array(10).fill(0).map(() => new Array(20).fill(0));
        speed = 1;
        score = 0;
        totalClears = 0;
        startClock()

        if (client) client.endSession();
        newPiece();

        gameOver = false
    }

    function getGerby() {
        console.error("Gerb not found. we automated deuterium yesterday on dyson sphere just a little fyi btw");
    }

    function startGame() {
        gameOpened = true
        reset()
    }

    function startBrowsing() {
        if (!validateUsername(username)) return

        client.updatePlayer({
            name: username
        })

        client.connectToServer()
        
        gameOpened = true
        browsing = true  
    }

    function increment() {
        time++;
        let timeSecs = Math.floor(time % 60) 
        let timeMins = Math.floor(time / 60)
        let secString = timeSecs < 10 ? "0" + timeSecs : timeSecs
        let minString = timeMins < 10 ? "0" + timeMins : timeMins
        clock = minString + ":" + secString;
    }

    function startClock() {
        setInterval(increment, 1000)
    }
</script>

<link
  href="https://fonts.googleapis.com/css?family=Press+Start+2P"
  rel="stylesheet"
/>

<svelte:window 
    on:keydown={(e) => {
        if (pieces.length > 0) e.preventDefault();
        move(e.key);
    }}

    on:beforeunload={(e) => {
        if (client) client.endSession()
    }}
/>
<div class="flex flex-col relative w-full h-full items-center justify-center"> 

    {#if !gameOpened}
        <div class="absolute w-full h-full top-0 left-0 bg-[rgb(51_51_51)] z-10 flex flex-col items-center justify-center">
            <div>
                <h1 class="text-white pixel text-5xl">Tetris</h1>

                <!-- <GameModeSelector bind:gameMode/> -->
                <div class="flex flex-col items-center justify-center">
                    <input bind:value={username} class="pixel bg-black border-white border text-sm line-clamp-1 w-52 text-white !outline-none mt-2 pl-2" placeholder="Username" type="text">
                </div>

                <div class="flex items-center justify-center">
                    <button on:click={startBrowsing}>
                        <p class:blocked={!canStart} class="w-fit border py-1 px-2 mt-2 bg-black pixel text-white text-sm text-center active:scale-95 hover:scale-105 transition duration-500">
                            Start
                        </p>
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if showSettings}
        <Settings bind:binds />
    {/if}

    {#if browsing && gameOpened}
        <Browser {client} bind:rooms/>
    {/if}

    <!-- Title Section -->
    <div class="flex flex-col ml-2 mt-2">
        <p class="pixel text-white text-4xl mt-2">TETRIS</p>
        <p class="pixel text-white text-md text-center">{clock}</p>
    </div>

    <div class="flex flex-row items-start mt-4">
        <!-- Held Piece Section -->
        <div class="flex flex-col items-center mr-4">
            <HeldPiece piece={heldTetromino} />
        </div>
        <!-- Canvas and Score -->
        <div class="relative w-fit h-fit">
            <canvas bind:this={canvas} class="border-2 bg-black"></canvas>
            <div class="absolute top-0 left-0 w-full h-full flex flex-col items-start justify-start pt-5 pl-5">
                <p class="pixel text-white text-sm">{username}</p>
            </div>        
            <div class="absolute top-5 left-0 w-full h-full flex flex-col items-start justify-start pt-5 pl-5">
                <p class="pixel text-white text-sm">Score: {score}</p>
            </div>
            <div class="absolute top-10 left-0 w-full h-full flex flex-col items-start justify-start pt-5 pl-5">
                <p class="pixel text-white text-sm">Level: {level}</p>
            </div>
        </div>
        <!-- Next Piece Section -->
        <div class="flex flex-col items-center ml-4">
            <NextPiece pieces={nextPiece} />
        </div>
    </div>
</div>

{#if !browsing}
    <div class="absolute top-2 right-2 w-full h-full z-20 pointer-events-none">
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <!-- svelte-ignore a11y_missing_attribute -->
        <button on:click={() => showSettings = !showSettings}>
            <img src="./settings.svg" alt="settings" class="w-[48px] h-[48px] ml-3 pointer-events-auto invert aspect-square">
        </button>
    </div>
{/if}

{#if otherPlayers}
    <div class="w-full h-full absolute top-0 left-0 pointer-events-none">
        {#each Object.entries(otherPlayers) as player}
            <OtherPlayers player={player[1]} />
        {/each}
    </div>
{/if}

<style lang="postcss">
    .blocked {
        @apply scale-90 border-neutral-900 text-neutral-900 cursor-auto;
    }
</style>