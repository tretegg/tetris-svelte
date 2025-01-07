<script lang="ts">
    import { onMount } from "svelte";
    import { type nextPieces, type Shape } from "$lib/client/client";

    export let pieces: nextPieces[] = [];
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 40;

    let yValues: number[] = [1, 4, 7];

    onMount(() => {
        canvas.width = 200;
        canvas.height = 440;

        ctx = canvas.getContext("2d")!;
        ctx.scale(CELLSIZE, CELLSIZE);
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
        ctx.clearRect(0, 0, 200, 400);
        drawGrid(CELLSIZE);
        pieces.forEach((element) => {
            let x = 1;
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
                            x + colIndex, 
                            yValues[piecenum] + rowIndex, 
                            1, 1
                        );

                        // Set the outline color (adjusted) and line width for the inner outline
                        ctx.strokeStyle = adjust(element.color, -20); // Outline color adjusted
                        ctx.lineWidth = 0.1; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            x + colIndex + 0.05,  // Slightly shift right
                            yValues[piecenum] + rowIndex + 0.05,   // Slightly shift down
                            1 - 0.1,  // Shrink the width and height for the outline to appear inside
                            1 - 0.1    // Shrink the width and height for the outline to appear inside
                        );
                    }
                });
            });
            piecenum++;
        });
    }

    function adjust(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

</script>

<canvas bind:this={canvas} class="border-2 ml-2 mt-2 bg-black"></canvas>