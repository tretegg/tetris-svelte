<script lang="ts">
    import { onMount } from "svelte";
    import type { Player } from "./client/client";

    let CELLSIZE = 20;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    export let player: Player;

    onMount(() => {
        ctx = canvas.getContext("2d")!;
        canvas.width = 200;
        canvas.height = 400;
        ctx.scale(CELLSIZE, CELLSIZE);
        setInterval(draw, 1000 / 30);
    })

    function draw() {
        ctx.clearRect(0, 0, 200, 400);
        drawGrid(CELLSIZE);

        // Draw the player's grid
        for (let row = 0; row < player.grid.length; row++) {
            for (let col = 0; col < player.grid[row].length; col++) {
                const cell = player.grid[row][col];
                if (cell === 1) {
                    ctx.fillStyle = "grey";
                    ctx.fillRect(col, row, 1, 1);
                    // Set the outline color (adjusted) and line width for the inner outline
                    ctx.strokeStyle = adjust("#808080", -30); // Outline color adjusted
                        ctx.lineWidth = 0.1; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            col + 0.05,  // Slightly shift right
                            row + 0.05,   // Slightly shift down
                            1 - 0.1,  // Shrink the width and height for the outline to appear inside
                            1 - 0.1    // Shrink the width and height for the outline to appear inside
                        );
                }
            }
        }
        // Draw current piece with colors
        for (let row = 0; row < player.currentPiece!.shape.length; row++) {
            for (let col = 0; col < player.currentPiece!.shape[row].length; col++) {
                const cell = player.currentPiece!.shape[row][col];
                if (cell === 1) {
                    ctx.fillStyle = player.currentPiece!.color;
                    ctx.fillRect(player.currentPiece!.x + col, player.currentPiece!.y + row, 1, 1);
                    // Set the outline color (adjusted) and line width for the inner outline
                    ctx.strokeStyle = adjust(player.currentPiece!.color, -30); // Outline color adjusted
                        ctx.lineWidth = 0.1; // Outline thickness

                        // Draw the outline, but slightly shrink the position to apply inside the shape
                        ctx.strokeRect(
                            player.currentPiece!.x + col + 0.05,  // Slightly shift right
                            player.currentPiece!.y + row + 0.05,   // Slightly shift down
                            1 - 0.1,  // Shrink the width and height for the outline to appear inside
                            1 - 0.1    // Shrink the width and height for the outline to appear inside
                        );
                }
            }
        }

        // Draw the next pieces with colors
    }

    // Allows you to lighten or darken a color
    function adjust(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    function drawGrid(cellSize: number) {
        ctx.save(); // Save the current state of the canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transform to draw the grid accurately

        ctx.strokeStyle = "grey";
        ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = 0; x <= 200; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 400);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= 400; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(200, y);
            ctx.stroke();
        }

        ctx.restore(); // Restore the canvas state
    }

</script>

<div class="w-fit h-fit">
    <div class="w-full h-full absolute top-0 left-0 pixel">
        <p>Score: {player.score}</p>
    </div>

    <canvas bind:this={canvas} class="border-2 bg-black"></canvas>    
</div>