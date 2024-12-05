<script lang="ts">
    import { onMount } from "svelte";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 40;
    type Shape = number[][];
    const SHAPES: Shape[] = [
        [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ],
        [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        [
            [1, 1],
            [1, 1]
        ],
        [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
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
    type Piece = {
        x: number,
        y: number,
        color: string
        shape: Shape
        grounded: boolean
    }
    let pieces: Piece[];
    let speed = 1;

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
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid(CELLSIZE); // Draw a grid with 40px cells
        pieces.forEach((element) => {
            // For each element in the pieces array
            element.shape.forEach((row, rowIndex) => {
                // For each row
                row.forEach((cell, colIndex) => {
                    // For each cell
                    if (cell === 1) {
                        ctx.fillStyle = element.color;
                        ctx.fillRect(element.x + colIndex, element.y + rowIndex, 1, 1);
                    }
                });
            });
        });
    }

    function lower() {
        pieces.forEach((element) => {
            if (!element.grounded && !collision(element)) element.y++;
        });
    }

    function drawGrid(cellSize: number) {
        ctx.save(); // Save the current state of the canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transform to draw the grid accurately

        ctx.strokeStyle = "grey";
        ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = 0; x <= canvas.width; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= canvas.height; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
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

    function move(key: string) {
        if (key === "a") {
            pieces.forEach((element) => {
                if (!element.grounded && !collision(element, "left")) element.x--;
            });
        } else if (key === "d") {
            pieces.forEach((element) => {
                if (!element.grounded && !collision(element, "right")) element.x++;
            });
        } else if (key === "s") {
            pieces.forEach((element) => {
                if (!element.grounded && !collision(element, "down")) element.y++;
            });
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
                pieces.forEach(element => {
                    if (element.grounded) {
                        for (let row2 = 0; row2 < element.shape.length; row2++) {
                            for (let col2 = 0; col2 < element.shape[row2].length; col2++) {
                                const cell2 = element.shape[row][col];
                                if (cell === 1 && cell2 === 1 && element.x +row2 === tempPiece.x + row && element.y + col2 === tempPiece.y + col) {
                                    return true;
                                }
                            }
                        }
                    }
                });
            }
        }
        // Check grid boundaries

        // Leftmost x value
        let leftmostX = 4;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1 && row < leftmostX) {
                    leftmostX = row;
                }
            }
        }
        leftmostX = tempPiece.x + leftmostX;
        // Rightmost x value
        let rightmostX = 0;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1 && row > rightmostX) {
                    rightmostX = row;
                }
            }
        }
        rightmostX = tempPiece.x + rightmostX;
        //Bottom y value
        let bottomY = 0;
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                const cell = piece.shape[row][col];
                if (cell === 1 && col < bottomY) {
                    bottomY = col;
                }
            }
        }
        bottomY = tempPiece.y + bottomY;
        console.log(bottomY);

        if (leftmostX < 0 || rightmostX >= canvas.width / CELLSIZE) {
            return true;
        } else if (bottomY >= canvas.height / CELLSIZE) {
            newPiece();
            piece.grounded = true; 
            return true;
        }

        return false;
    }
</script>

<svelte:window 
    on:keypress={(e) => {
        if (e.key === " ") newPiece();
        else if (e.key !== " ") move(e.key);
    }}
/>

<canvas bind:this={canvas} class="border-2 ml-2 mt-2 bg-black"></canvas>

