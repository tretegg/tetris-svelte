<script lang="ts">
    import { onMount } from "svelte";
    import { type heldPiece, type Shape } from "$lib/client/client";

    export let piece: heldPiece;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 40;

    let yValues: number[] = [40, 160, 280];

    onMount(() => {
        canvas.width = 160;
        canvas.height = 160;

        ctx = canvas.getContext("2d")!;
        setInterval(draw, 1000 / 60);
    })

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

    function draw() {
        let piecenum = 0
        let x = getX();
        ctx.clearRect(0, 0, 200, 400);
        drawGrid(CELLSIZE);
        if (piece) {
            // For each piece in the pieces array
            piece.shape.forEach((row, rowIndex) => {
                // For each row of the piece
                row.forEach((cell, colIndex) => {
                    // For each cell in the row

                    if (cell === 1) {
                        // Set the fill color for the piece
                        ctx.fillStyle = piece.color;
                        // Fill the rectangle (the block in the piece)
                        ctx.fillRect(
                            x + colIndex * CELLSIZE, 
                            yValues[piecenum] + rowIndex * CELLSIZE, 
                            CELLSIZE, CELLSIZE
                        );

                        // Set the outline color (adjusted) and line width for the inner outline
                        ctx.strokeStyle = adjust(piece.color, -20); // Outline color adjusted
                        ctx.lineWidth = 4; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            x + colIndex * CELLSIZE + 2,  // Slightly shift right
                            yValues[piecenum] + rowIndex * CELLSIZE + 2,   // Slightly shift down
                            CELLSIZE - 4,  // Shrink the width and height for the outline to appear inside
                            CELLSIZE - 4    // Shrink the width and height for the outline to appear inside
                        );
                    }
                });
            });
        }
        piecenum++;
    }

    function adjust(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    function getX(): number {
        let x = 20;
        // Center piece
        return x
    }

</script>

<div class="relative w-fit h-fit">
    <canvas bind:this={canvas} class="border-2 bg-black"></canvas>        
    <div class="absolute top-0 left-0 w-full h-full flex flex-col items-start justify-start pt-5 pl-5">
        <p class="pixel text-white text-sm">Held:</p>
    </div>
</div>