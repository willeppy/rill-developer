<script>
  import Base from "./Base.svelte";
  export let isNull = false;
  export let inTable = false;
  export let dark = false;
  export let customStyle = "";
</script>

<Base
  {isNull}
  classes="font-semibold {customStyle} {inTable && 'block text-right'}"
  {dark}
>
  <slot />
</Base>
