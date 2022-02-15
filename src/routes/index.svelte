<script context="module">
	import { title } from '$lib/store';

	export async function load({ session, fetch }) {

		// set title
		title.set('Home');

		const { user } = session;

		const response = await fetch('/lending');
		if (!response.ok) {
			return {};
		}

		const json = await response.json();
		return {
			props: {
				current_user: user,
				nbrOfItems: json.count,
				items: json.items,
			},
		};
	}
</script>

<div class="content">

	{#if current_user}
		<div id="barcode-txt-container">
			<h2 style="font-size: 2rem;">Hello, {current_user.fullname}</h2>
			<Textfield
				variant="outlined"
				bind:this={barcodeTextbox}
				bind:value={barcode}
				on:keydown={handleBarcode}
				on:input={() => /* handleBarcode() */ {}}
				on:propertychange={() => /* handleBarcode() */ {}}
				on:paste={() => /* handleBarcode() */ {}}
				label="barcode"
			>
				<Icon class="material-icons" slot="leadingIcon">qr_code</Icon>
				<HelperText slot="helper">press enter to confirm</HelperText>
				<CircularProgress style={`display: ${barcodeLoading ? 'block' : 'none'}; height: 46px; width: 46px; margin: 5px 10px 0 0;`} slot="trailingIcon" indeterminate />
			</Textfield>
		</div>
	{/if}

	<!-- <div id="borrow-return-txt-container">
		<h2>{successMsg}</h2>
	</div> -->

	<DataTable style="width: 100%;">
		<Head>
			<Row>
				<Cell numeric>#</Cell>
				<Cell style="width: 100%;">equipment</Cell>
				<Cell>borrowed by</Cell>
				<Cell>lending date</Cell>
				<Cell>return date</Cell>
				<Cell>status</Cell>
				<Cell>remarks</Cell>
				<Cell></Cell>
			</Row>
		</Head>
		<Body>
			{#each items as item, idx (item.id)}
				<Row>
					<Cell numeric>{item.id}</Cell>
					<Cell>{item.equipment.name}</Cell>
					<Cell>{item.user.fullname}</Cell>
					<Cell>
						<Wrapper>
							<Label>{DateTime.fromSQL(item.lending_date).toFormat('dd/MM/yyyy')}</Label>
							<Tooltip>{timeAgo(DateTime.fromSQL(item.lending_date))}</Tooltip>
						</Wrapper>
					</Cell>
					<Cell>
						{#if item.return_date === null}
							-
						{:else}
							<Wrapper>
								<Label>{DateTime.fromSQL(item.return_date).toFormat('dd/MM/yyyy')}</Label>
								<Tooltip>{timeAgo(DateTime.fromSQL(item.return_date))}</Tooltip>
							</Wrapper>
						{/if}
					</Cell>
					<Cell>
						{#if item.status === 0}
							<span style="color: var(--mdc-theme-error, #b71c1c);">❌ Not returned</span>
						{:else}
							<span style="color: green;">✔️ Returned</span>
						{/if}
					</Cell>
					<Cell>{item.remarks}</Cell>
					<Cell>
						{#if current_user && (item.user_id === current_user.id || current_user.role > 0)}
							<IconButton class="material-icons" on:click={() => openEditDialog(item)}>edit</IconButton>
						{/if}
					</Cell>
				</Row>
			{/each}
		</Body>
	
		<Pagination slot="paginate">
			<svelte:fragment slot="total">
				{start + 1}-{end} of {items.length}
			</svelte:fragment>
	
			<IconButton
				class="material-icons"
				action="first-page"
				title="First page"
				on:click={() => (currentPage = 0)}
				disabled={currentPage === 0}>first_page</IconButton
			>
			<IconButton
				class="material-icons"
				action="prev-page"
				title="Prev page"
				on:click={() => currentPage--}
				disabled={currentPage === 0}>chevron_left</IconButton
			>
			<IconButton
				class="material-icons"
				action="next-page"
				title="Next page"
				on:click={() => currentPage++}
				disabled={currentPage === lastPage}>chevron_right</IconButton
			>
			<IconButton
				class="material-icons"
				action="last-page"
				title="Last page"
				on:click={() => (currentPage = lastPage)}
				disabled={currentPage === lastPage}>last_page</IconButton
			>
		</Pagination>

		<LinearProgress
			indeterminate
			bind:closed={itemsLoaded}
			slot="progress"
		/>
	</DataTable>

	<Dialog
		bind:open
		surface$style="width: 600px; max-width: calc(100vw - 32px);"
	>
		<Title>Edit a lending</Title>
		<DialogContent>
			<div id="dialog-content">
				<input bind:value={lending_id} type="hidden" />
				<Textfield bind:value={lending_remarks} label="remarks"></Textfield>
			</div>
		</DialogContent>
		<DialogActions>
			<Button on:click={() => {}}>
				<Label>Cancel</Label>
			</Button>
			<Button on:click={async () => {
				await doEdit();
				fetchItems();
			}}>
				<Label>Edit</Label>
			</Button>
		</DialogActions>
	</Dialog>

	<Snackbar leading bind:this={snackbar}>
		<Label>{errorMsg}</Label>
	</Snackbar>

	<Snackbar
		variant="stacked"
		bind:this={forceTransferSnackbar}
	>
		<Label>{errorMsg}</Label>
		<Label>Do you want to forcefully transfer to you?</Label>
		<Actions>
			<Button on:click={forcefullyBorrow}>Transfer</Button>
		</Actions>
	</Snackbar>
</div>

<script lang="ts">
	import type { Lending } from '$lib/db';
	import { browser } from '$app/env';
	import { onMount } from 'svelte'
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import DataTable, { Head, Body, Row, Cell, Pagination } from '@smui/data-table';
	import Icon from '@smui/textfield/icon';
	import IconButton from '@smui/icon-button';
	import Button from '@smui/button';
	import Dialog, { Title, Content as DialogContent, Actions as DialogActions } from '@smui/dialog';
	import CircularProgress from '@smui/circular-progress';
	import LinearProgress from '@smui/linear-progress';
	import Snackbar, { SnackbarComponentDev, Actions, Label } from '@smui/snackbar';
	import { DateTime } from 'luxon';
	import Tooltip, { Wrapper } from '@smui/tooltip';
	import { errorHtmlToPlaintext, timeAgo } from '$lib/util';

	export let current_user;
	export let items = [];
	export let nbrOfItems: number = 0;
	let itemsLoaded = true;

	const rowsPerPage = 50;
	let currentPage = 0;

	$: start = currentPage * rowsPerPage;
	$: end = Math.min(start + rowsPerPage, nbrOfItems);
	$: lastPage = Math.max(Math.ceil(nbrOfItems / rowsPerPage) - 1, 0);

	$: if (currentPage > lastPage) {
		currentPage = lastPage;
	}

	// fetch database reactive to `currentPage`
	$: currentPage, fetchItems();
	const REACTIVES = 1;
	let reacteds = 0;

	let snackbar: SnackbarComponentDev;
	let forceTransferSnackbar: SnackbarComponentDev;
	let errorMsg = '';
	// let successMsg = '';

	let open = false;

	// lending information for dialog
	let lending_id: string = '';
	let lending_remarks: string = '';

	let barcode: string = '';
	let barcodeTextbox;
	let barcodeDebouncer = setTimeout(() => {}, 1);
	let barcodeLoading = false;

	const focusOnBarcodeTxt = () => {
		if (barcodeTextbox !== undefined) {
			barcodeTextbox.focus();
		}
	};

	// focus on barcode text field on component mounted
	onMount(focusOnBarcodeTxt);

	// variable for binding forcefully borrow function
	let forcefullyBorrow = () => {};

	const borrowOrReturn = async (bc: string, force = false) => {

		// show activity indicator
		barcodeLoading = true;

		const response = await fetch('/lending', {
			method: 'PUT',
			body: new URLSearchParams({
				barcode: bc,
				force: `${force ? 1 : 0}`,
			}),
		});

		// hide activity indicator
		barcodeLoading = false;

		return response;
	};

	// parse barcode
	const handleBarcode = async (event) => {

		// // TO-DO: 700ms delay for external barcode scanner
		// clearTimeout(barcodeDebouncer);
		// barcodeDebouncer = setTimeout(async () => {
		if (event.key === 'Enter') {

			const response = await borrowOrReturn(barcode);

			// show error response on snackbar if not ok
			if (!response.ok) {

				errorMsg = errorHtmlToPlaintext(await response.text());

				// 409 Conflict: this equipment has already been borrowed by another person
				if (response.status === 409) {

					// bind forcefully borrow function to the button
					forcefullyBorrow = (async (barcode: string) => {
						const response = await borrowOrReturn(barcode, true);
						// show error response on snackbar if not ok
						if (!response.ok) {
							errorMsg = errorHtmlToPlaintext(await response.text());
							snackbar.open();
						} else {
							fetchItems();
						}
					}).bind(this, barcode);

					// show force transfer confirmation snackbar
					forceTransferSnackbar.open();

				// other errors
				} else {
					snackbar.open();
				}
			}

			// clear barcode text field
			barcode = '';
			focusOnBarcodeTxt();

			// // show successful response
			// successMsg = await response.text();

			// fetch items on success
			if (response.ok) {
				fetchItems();
			}

		}
		// }, 700);
	};

	const doEdit = async () => {

		// POST /lending
		const response = await fetch('/lending', {
			method: 'POST',
			body: new URLSearchParams({
				id: lending_id,
				remarks: lending_remarks,
			}),
		});

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = errorHtmlToPlaintext(await response.text());
			snackbar.open();
		}
	};

	const openEditDialog = (item: Lending) => {

		// initialize input boxes
		lending_id = `${item.id}`;
		lending_remarks = item.remarks;

		// open dialog
		open = true;
	};

	const fetchItems = async () => {

		// client-only
		if (!browser) {
			return;
		}

		// TO-DO: this small hack to prevent fetching on initial render
		if (reacteds < REACTIVES) {
			reacteds++;
			return;
		}

		items = [];

		// display progress indicator
		itemsLoaded = false;

		// GET /lending
		const response = await fetch(`/lending?${new URLSearchParams({ offset: `${start}` }).toString()}`);

		// hide progress indicator
		itemsLoaded = true;

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = 'Unable to fetch lending';
			snackbar.open();
			return;
		}

		const json = await response.json();
		nbrOfItems = json.count;
		items = json.items;
	};
</script>

<style>
	#barcode-txt-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	/* #borrow-return-txt-container {
		color: green;
		text-align: center;
		margin-top: 60px;
	} */

	:global(#dialog-content) {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>