<script context="module">
	export function load({ error, status }) {
		return {
			props: {
				errorMsg: `${error.message}`
			}
		};
	}
</script>

<script>
	export let errorMsg;
</script>

<h1>{@html errorMsg}</h1>
