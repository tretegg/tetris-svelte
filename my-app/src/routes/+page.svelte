<script lang="ts">
    import { TetrisClient, type Piece, type Shape } from "$lib/client/client";
    import { onMount } from "svelte";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 40;

    const SHAPES: Shape[] = [
        [
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

    type cell = {
        x: number,
        y: number,
        color: string
    }

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
                        ctx.strokeStyle = adjust(element.color, -20); // Outline color adjusted
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
        pieces.forEach(piece => {
            if (!piece.grounded) return;
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
        });
    }

    function clearLines() {

        let clearedLines: number[] = [];

        // Check for full rows and mark them for clearing
        for (let row = 0; row < grid.length; row++) {
            if (isRowFull(grid[row])) {
                console.log("row full", row)
                clearedLines.push(row);
            }
        }

        if (clearedLines.length <= 0) return;

        clearedLines.forEach(line => {
            // Remove the line and fill it with 0's
            grid.splice(line, 1);
            // Add a new empty row to the top
            grid.unshift(new Array(10).fill(0));
            
            pieces.forEach(piece => {
                // Check if the piece is grounded
                // Grounded as in not the one being moved by the player
                if (piece.grounded) {
                    let piecePartCleared = false;
                    let pieceWidth = piece.shape[0].length;
                    for (let row = 0; row < piece.shape.length; row++) {
                        // If it's in the same row as the cleared line
                        if (piece.y + row === line) {
                            // Remove it from the pieces shape
                            piece.shape.splice(row, 1);
                            piecePartCleared = true;
                            piece.shape.unshift(new Array(pieceWidth).fill(0));
                            console.log("Changed Piece: ", piece)
                            break;
                        }
                    }
                    if (!piecePartCleared && piece.y + getLowestPieceY(piece) < line) {
                        piece.y++;
                    }
                }
            });
        });
        

        updateGrid();
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

        // Select a random available shape
        while (!available) {
            randomIndex = Math.floor(Math.random() * SHAPES.length);
            if (availableShapes[randomIndex]) {
                available = true;
            }
        }

        shape = SHAPES[randomIndex];
        availableShapes[randomIndex] = false;

        // Reset availableShapes if all shapes are used
        if (availableShapes.every((available) => !available)) {
            availableShapes = Array(SHAPES.length).fill(true);
        }

        // Align piece placement with grid size
        pieces.push({
            x: Math.floor((canvas.width / CELLSIZE - shape[0].length) / 2), // Adjust for grid width
            y: 0,
            color: COLORS[randomIndex],
            shape: shape,
            grounded: false
        });
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

            if (key === "a" && !collision(element, "left")) {
                element.x--;
            } else if (key === "d" && !collision(element, "right")) {
                element.x++;
            } else if (key === "s" && !collision(element, "down")) {
                element.y++;
            } else if (key === "ArrowRight") {
                const rotatedShape = rotateClockwise(element.shape);
                const tempPiece = { ...element, shape: rotatedShape };
                if (!collision(tempPiece)) {
                    element.shape = rotatedShape;
                }
            } else if (key === "ArrowLeft") {
                const rotatedShape = rotateCounterclockwise(element.shape);
                const tempPiece = { ...element, shape: rotatedShape };
                if (!collision(tempPiece)) {
                    element.shape = rotatedShape;
                }
            } else if (key === " ") {
                while (!collision(element, "down")) {
                    element.y++;
                }
            } else {
                return
            }
        });
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

    function reset() {
        // TODO: Reset the game state
        pieces = [];
        grid = new Array(10).fill(0).map(() => new Array(20).fill(0));
        speed = 1;
        newPiece();
    }
</script>

<link
  href="https://fonts.googleapis.com/css?family=Press+Start+2P"
  rel="stylesheet"
/>


<svelte:window 
    on:keydown|preventDefault={(e) => {
        move(e.key);
    }}
/>
<div class="flex flex-col
 w-full h-full items-center justify-center"> 
    <div class="flex flex-col ml-2 mt-2">
        <p class="pixel text-white text-4xl mt-2">TETRIS</p>
        <button class="pixel border-black border-2 hover:scale-105 transition duration-200 rounded-md"
        on:click={reset}>Start</button>
    </div>

    <canvas bind:this={canvas} class="border-2 ml-2 mt-2 bg-black"></canvas>
</div>

<style>
    .pixel {
        font-family: 'Press Start 2P', cursive;
    }

</style>