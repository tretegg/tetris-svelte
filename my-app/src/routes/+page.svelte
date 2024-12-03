<script lang="ts">
    import { onMount } from "svelte";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    onMount(() => {
        canvas.width = 400;
        canvas.height = 800;
        ctx = canvas.getContext("2d")!;
        ctx.scale(40, 40);
        draw(0, 0, 1, 1);
    })

    function draw(x: number, y: number, w:number , h:number ) {
        ctx.fillStyle = "red";
        ctx.fillRect(x, y, w, h);
    }

</script>

<canvas bind:this={canvas} class="border-2 ml-2 mt-2"></canvas>