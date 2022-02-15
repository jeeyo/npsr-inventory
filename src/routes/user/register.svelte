<script context="module">
	import { title } from '$lib/store';

	export async function load() {

		// set title
		title.set('Register');

		// TO-DO: disallow register, only admins can create a new user
		// return {};
		return {
			status: 302,
			redirect: '/',
		};
	}
</script>

<div class="content">
	<div id="register-box">
		<Textfield bind:value={username} label="Username"></Textfield>
		<Textfield bind:value={password} type="password" label="Password">
			<HelperText slot="helper">
				{invalidPassword ? 'please make sure your password length is equal or longer than 8 characters' : ''}
			</HelperText>
		</Textfield>
		<Textfield bind:value={password_confirm} type="password" label="Password Confirmation">
			<HelperText slot="helper">
				{invalidPasswordConfirm ? 'Password does not match' : ''}
			</HelperText>
		</Textfield>
		<Textfield bind:value={fullname} label="Full name"></Textfield>
		<Textfield bind:value={email} on:keydown={enterToRegister} label="Email">
			<HelperText slot="helper">
				{invalidEmail ? 'Invalid email address' : ''}
			</HelperText>
		</Textfield>
		<hr>
		<Button on:click={doRegister} variant="raised">
			<Label>Register</Label>
		</Button>
		<hr>
		<span>Already have an account? <a href="/user/login">Login</a></span>
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
	let password_confirm = '';
	let fullname = '';
	let email = '';

	// reactive (computed) properties of password and email verifications
	$: invalidPassword = password.length > 0 && password.length < 8;
	$: invalidPasswordConfirm = password !== password_confirm;
	$: invalidEmail = !email
		.toLowerCase()
		.match(
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		);

	// snackbar for showing error messages
	let snackbar: SnackbarComponentDev;
	let errorMsg = '';

	// call api to register a new user
	const doRegister = async () => {

		if (invalidPassword || invalidPasswordConfirm || invalidEmail) {
			errorMsg = 'Please re-check your password, password confirmation, and email';
			snackbar.open();
			return;
		}

		const response = await fetch('/user/register', {
			method: 'POST',
			body: new URLSearchParams({
				username: username,
				password: password,
				fullname: fullname,
				email: email,
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

	// detect <Enter> key to do register
	const enterToRegister = async (event) => {
		if (event.key === 'Enter') {
			doRegister();
		}
	};
</script>

<style>
	#register-box {
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
