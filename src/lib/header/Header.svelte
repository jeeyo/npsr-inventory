<svelte:head>
	<title>Equipment Management System | {$title}</title>
</svelte:head>

<header>
	<TopAppBar
		variant="static"
		color={'primary'}
	>
		<Row>
			<Section>
				<!--IconButton class="material-icons">menu</IconButton-->
				<Title>{$title}</Title>
			</Section>
			<Section align="end" toolbar>
			<Button on:click={() => goto('/')}>
				<Icon class="material-icons">home</Icon>
				<Label>Home</Label>
			</Button>
				{#if current_user}
				<Button on:click={() => goto('/manage')}>
					<Icon class="material-icons">settings</Icon>
					<Label>Manage</Label>
				</Button>
				{/if}
				{#if current_user}
				<Button>
					<Icon class="material-icons">account_circle</Icon>
					<Label>{current_user.username}</Label>
				</Button>
				{/if}
				<Button on:click={() => {
					if (current_user) {
						location.href = '/user/logout';
					} else {
						goto('/user/login');
					}
				}}>
					<Label>{current_user ? 'Logout' : 'Login'}</Label>
				</Button>
			</Section>
		</Row>
	</TopAppBar>
</header>

<script lang="ts">
	import { get } from 'svelte/store';
	import { getStores, navigating, page, session } from '$app/stores';
	import { goto } from '$app/navigation';
	import { title } from '$lib/store';

	import TopAppBar, { Row, Section, Title } from '@smui/top-app-bar';
	import Button, { Icon, Label } from '@smui/button';

	let current_user = get(session).user;
</script>

<style>
</style>
