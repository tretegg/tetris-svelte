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
    let availableShapes: boolean[] = Array(SHAPES.length).fill(true);
    type Piece = {
        x: number,
        y: number,
        color: string
        shape: Shape
    }
    let pieces: Piece[] = [];
    let speed = 1;

    onMount(() => {
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
            element.y++;
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
            color: "red",
            shape: shape,
        });
    }


</script>

<svelte:window 
    on:keypress={(e) => {
        if (e.key === " ") newPiece();
    }}
/>


<canvas bind:this={canvas} class="border-2 ml-2 mt-2 bg-black"></canvas>

