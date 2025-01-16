<script lang="ts">
    import { onMount } from "svelte";
    import { type nextPieces, type Shape } from "$lib/client/client";

    // Smaller version of the nextPiece component for other players

    export let pieces: nextPieces[] = [];
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const CELLSIZE = 20;

    let yValues: number[] = [20, 80, 140];

    onMount(() => {
        canvas.width = 100;
        canvas.height = 200;

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
        ctx.clearRect(0, 0, 100, 200);
        drawGrid(CELLSIZE);
        pieces.forEach((element) => {
            let x = getX(element);
            let y = getY(element);
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
                            x + colIndex * CELLSIZE, 
                            yValues[piecenum] + rowIndex * CELLSIZE + y, 
                            CELLSIZE, CELLSIZE
                        );

                        // Set the outline color (adjusted) and line width for the inner outline
                        ctx.strokeStyle = adjust(element.color, -30); // Outline color adjusted
                        ctx.lineWidth = 2; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            x + colIndex * CELLSIZE + 1,  // Slightly shift right
                            yValues[piecenum] + rowIndex * CELLSIZE + y + 1,   // Slightly shift down
                            CELLSIZE - 2,  // Shrink the width and height for the outline to appear inside
                            CELLSIZE - 2    // Shrink the width and height for the outline to appear inside
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

    function getX(piece: nextPieces): number {
        let x = 20;
            if (piece.pieceID === 3) {
                x = 10
            } else if (piece.pieceID === 4) {
                x = 30
            }
        return x
    }

    function getY(piece: nextPieces): number {
        let y = 0;
            if (piece.pieceID === 0) {
                y = -20
            } 
        return y
    }

</script>

<div class="relative w-fit h-fit">
    <canvas bind:this={canvas} class="border-2 bg-black"></canvas>        
    <div class="absolute top-0 left-0 w-full h-full flex flex-col items-start justify-start pt-5 pl-5">
        <p class="pixel text-white text-sm">Next:</p>
    </div>
</div>