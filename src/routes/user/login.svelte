<script context="module">
	import { title } from '$lib/store';

	export async function load({ session }) {

		// set title
		title.set('Login');

		const { user } = session;

		if (user) {
			return {
				status: 302,
				redirect: '/',
			};
		}

		return {};
	}
</script>

<div class="content">
	<div id="login-box">
		<Textfield bind:value={username} label="Username"></Textfield>
		<Textfield bind:value={password} on:keydown={enterToLogin} type="password" label="Password"></Textfield>
		<hr>
		<Button on:click={doLogin} variant="raised">
			<Label>Login</Label>
		</Button>
		<hr>
		<!-- a href="/user/register">Create a new user</a -->
	</div>

	<Snackbar leading bind:this={snackbar}>
		<Label>{errorMsg}</Label>
	</Snackbar>
</div>

<script lang="ts">
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import Button, { Label } from '@smui/button';
	import Snackbar, { SnackbarComponentDev } from '@smui/snackbar';
	import { errorHtmlToPlaintext } from '$lib/util';

	let username = '';
	let password = '';

	// snackbar for showing error messages
	let snackbar: SnackbarComponentDev;
	let errorMsg = '';

	// call api to login
	const doLogin = async () => {

		const response = await fetch('/user/login', {
			method: 'POST',
			body: new URLSearchParams({
				username: username,
				password: password,
			}),
		});

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = errorHtmlToPlaintext(await response.text());
			snackbar.open();
			return;
		}

		location.href = '/';
	};

	// detect <Enter> key to do login
	const enterToLogin = async (event) => {
		if (event.key === 'Enter') {
			doLogin();
		}
	};
</script>

<style>
	#login-box {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 50%;
		max-width: 1024px;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>
