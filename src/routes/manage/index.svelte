<script context="module">
	import { title } from '$lib/store';

	export async function load({ session, fetch }) {

		// set title
		title.set('Manage');

		const { user } = session;

		if (!user) {
			return {
				status: 302,
				redirect: '/',
			};
		}

		const user_response = await fetch('/user');
		if (!user_response.ok) {
			return {};
		}

		const equipment_category_response = await fetch('/equipment/category');
		if (!equipment_category_response.ok) {
			return {};
		}

		const json = await user_response.json();
		return {
			props: {
				current_user: user,
				nbrOfItems: json.count,
				items: json.items,
				__equipment_categories: (await equipment_category_response.json()).items,
			},
		};
	}
</script>

<div class="content">
	<TabBar tabs={Object.values(Tabs)} let:tab bind:active>
		<Tab {tab}>
			<Label>{tab}</Label>
		</Tab>
	</TabBar>

	<DataTable style="width: 100%;">
		<Head>
			{#if active === Tabs.Equipment}
				<Row>
					<Cell colspan={9}>
						<Content>
							<div id="search-txt-container">
								<Textfield
									bind:value={searchQuery}
									on:keydown={(event) => { event.key === 'Enter' ? refetch = true : {} }}
									label="search"
								>
									<Icon class="material-icons" slot="leadingIcon">search</Icon>
									<HelperText slot="helper">try 'card' or 'card category:adapter' then press enter to confirm</HelperText>
								</Textfield>
							</div>
						</Content>
					</Cell>
				</Row>
			{/if}
			<Row>
				<Cell numeric>id</Cell>
				{#if active === Tabs.User}
					<Cell style="width: 30%;">username</Cell>
					<Cell style="width: 70%;">fullname</Cell>
					<Cell></Cell>
					<Cell>email</Cell>
					<Cell>role</Cell>
				{:else if active === Tabs.Equipment}
					<Cell style="width: 20%;">name</Cell>
					<Cell style="width: 60%;">barcode</Cell>
					<Cell></Cell>
					<Cell style="width: 20%;">category</Cell>
					<Cell>status</Cell>
					<Cell></Cell>
				{:else if active === Tabs.EquipmentCategory}
					<Cell style="width: 70%;">name</Cell>
					<Cell>number of equipments</Cell>
				{/if}
				{#if current_user}
					<!-- allow a User to edit itself -->
					<!-- Edit -->
					<Cell></Cell>
				{/if}
				{#if current_user && current_user.role > 0}
					<!-- Delete -->
					<Cell></Cell>
				{/if}
			</Row>
		</Head>
		<Body>
				{#each items as item, idx (item.id)}
					<Row>
						<Cell numeric>{item.id}</Cell>
						{#if active === Tabs.User}
							<Cell>{item.username}</Cell>
							<Cell>{item.fullname}</Cell>
							<Cell>
								{#if Array.isArray(item.lendings) && item.lendings.length > 0}
								<IconButton
									class="material-icons"
									on:click={() => accordionOpen[idx] = !accordionOpen[idx]}
								>
									{accordionOpen[idx] ? 'expand_less' : 'expand_more'}
								</IconButton>
								{/if}
							</Cell>
							<Cell>{item.email}</Cell>
							<Cell>{item.role === 0 ? 'User' : 'Administrator'}</Cell>
						{:else if active === Tabs.Equipment}
							<Cell>{item.name}</Cell>
							<Cell>{item.barcode}</Cell>
							<Cell>
								<IconButton
									class="material-icons"
									size="mini"
									on:click={() => accordionOpen[idx] = !accordionOpen[idx]}
								>
									{accordionOpen[idx] ? 'expand_less' : 'expand_more'}
								</IconButton>
							</Cell>
							<Cell>{item.category.name}</Cell>
							<Cell>
								{#if item.status === 0}
									<span style="color: green;">💚 Normal</span>
								{:else}
									<span style="color: var(--mdc-theme-error, #b71c1c);">💔 Broken</span>
								{/if}
							</Cell>
							<Cell>
							{#if Array.isArray(item.lendings) && item.lendings.length > 0 && item.lendings[0].status === 0}
								<Wrapper>
									<b style="color: var(--mdc-theme-error, #b71c1c); cursor: pointer;">❌ Unavailable</b>
									<Tooltip>Borrowed by {item.lendings[0].user.fullname}</Tooltip>
								</Wrapper>
							{:else}
								<span style="color: green;">✔️ Available</span>
							{/if}
							</Cell>
						{:else if active === Tabs.EquipmentCategory}
							<Cell>{item.name}</Cell>
							<Cell>{item.nbr_of_eqpts}</Cell>
						{/if}
						{#if current_user}
							<Cell>
								{#if current_user.role > 0 || active === Tabs.User && item.id === current_user.id}
									<!-- allow a User to edit itself -->
									<IconButton class="material-icons" on:click={() => openEditDialog(item)}>edit</IconButton>
								{/if}
							</Cell>
						{/if}
						{#if current_user && current_user.role > 0}
							<Cell><IconButton class="material-icons" on:click={() => openDeleteDialog(item)}>delete</IconButton></Cell>
						{/if}
					</Row>
					<Row style="height: 0;">
						<Cell colspan={9} style={`padding: 0; ${accordionOpen[idx] ? '' : 'border-bottom-width: 0;'}`}>
							<Accordion>
								<Panel color="#eee" variant="unelevated" extend bind:open={accordionOpen[idx]}>
									<Content>
										{#if active === Tabs.User}
											{#if Array.isArray(item.lendings) && item.lendings.length > 0}
												<b>Borrowing items</b>
												<ol class="lending-equipments-list">
													{#each item.lendings as lending}
														<li>
															<b>{lending.equipment.name }</b>
															{lending.remarks !== '' ? `(${lending.remarks})` : ''}
														</li>
													{/each}
												</ol>
											{/if}
										{:else if active === Tabs.Equipment}

											<LayoutGrid>
												<LayoutGridCell span={Array.isArray(item.lendings) && item.lendings.length > 0 ? 7 : 12}>
													<div style="text-align: center; font-size: 18px; margin-bottom: 16px;"><b>{item.name}</b></div>

													{#if accordionOpen[idx]}
														<ImageList class="equipment-photo-list-standard" style="min-height: 150px;" withTextProtection>
															{#each item.photos as photo}
																<Item>
																	<ImageAspectContainer>
																		<Image
																			async
																			src={`${CDN_URL}/${photo.filename}_thumbnail.webp?${new Date().getMilliseconds()}`}
																			alt={`Equipment ${item.id}`}
																			style="cursor: pointer;"
																			on:click={() => {
																				imageOverlayOpen = true;
																				imageOverlayUrl = `${CDN_URL}/${photo.filename}.webp?${new Date().getMilliseconds()}`;
																			}}
																		/>
																	</ImageAspectContainer>
																	{#if current_user && current_user.role > 0}
																		<Supporting style="display: flex; justify-content: flex-end; height: auto; padding: 0;">

																			<!-- Equipment Photo Delete Button -->
																			<IconButton
																				class="material-icons"
																				size="mini"
																				on:click={async () => {

																					// show the activity indicator
																					accordionLoading[idx] = true;

																					// DELETE /equipment/photo
																					const response = await fetch('/equipment/photo', {
																						method: 'DELETE',
																						body: new URLSearchParams({
																							id: photo.id,
																						}),
																					});

																					// hide the activity indicator
																					accordionLoading[idx] = false;

																					// show error response on snackbar if not ok
																					if (!response.ok) {
																						errorMsg = errorHtmlToPlaintext(await response.text());
																						snackbar.open();
																					}

																					// show the activity indicator
																					accordionLoading[idx] = true;

																					fetchPhotosForEquipment(item.id);

																					// hide the activity indicator
																					accordionLoading[idx] = false;
																				}}
																			>
																				delete
																			</IconButton>
																		</Supporting>
																	{/if}
																</Item>
															{/each}
														</ImageList>
													{/if}

													{#if current_user && current_user.role > 0}
														<!-- Equipment Photo Upload Button -->
														<!-- svelte-ignore missing-declaration -->
														<input
															style="display: none;"
															type="file"
															id={`eqpt_img_file_${item.id}`}
															on:change|self={async (event) => {

																// if a file is selected
																// @ts-ignore: TO-DO: cast event.target for linting
																if (!!event.target.files[0]) {

																	// append the file to formData
																	const formData = new FormData();
																	// @ts-ignore: TO-DO: cast event.target for linting
																	formData.append(`${item.id}`, event.target.files[0]);

																	// show the activity indicator
																	accordionLoading[idx] = true;

																	// upload the file
																	const response = await fetch('/equipment/photo', {
																		method: 'PUT',
																		body: formData,
																	});


																	// show error response on snackbar if not ok
																	if (!response.ok) {
																		errorMsg = errorHtmlToPlaintext(await response.text());
																		snackbar.open();
																	}

																	// show the activity indicator
																	accordionLoading[idx] = true;

																	fetchPhotosForEquipment(item.id);

																	// hide the activity indicator
																	accordionLoading[idx] = false;
																}
															}}
														/>

														<div style="display: flex; justify-content: space-between;">
																<IconButton class="material-icons" on:click={() => {
																	const element = document.getElementById(`eqpt_img_file_${item.id}`);
																	element.click();
																}}>add_a_photo</IconButton>
															{#if accordionLoading[idx]}
																<CircularProgress style="align-self: center; height: 32px; width: 32px;" indeterminate />
															{/if}
														</div>
													{/if}
												</LayoutGridCell>

												{#if Array.isArray(item.lendings) && item.lendings.length > 0}
													<LayoutGridCell span={5}>
														<b>Borrowing history</b>
														<ol class="lending-equipments-list">
															{#each item.lendings as lending}
																<li>
																	{#if lending.status === 0}
																		<span style="color: var(--mdc-theme-error, #b71c1c);">❌ Not returned</span>
																	{:else}
																		<span style="color: green;">✔️ Returned</span>
																	{/if}
																	by <b>{lending.user.fullname}</b>
																	{lending.remarks !== '' ? `(${lending.remarks})` : ''}
																	from {DateTime.fromSQL(lending.lending_date).toFormat('dd/MM/yyyy')}
																	{lending.return_date !== null ? `to ${DateTime.fromSQL(lending.return_date).toFormat('dd/MM/yyyy')}` : ''}
																</li>
															{/each}
														</ol>
													</LayoutGridCell>
												{/if}
											</LayoutGrid>
										{/if}
									</Content>
								</Panel>
							</Accordion>
						</Cell>
					</Row>
				{/each}
		</Body>
	
		<Pagination slot="paginate">
			<svelte:fragment slot="total">
				{start + 1}-{end} of {nbrOfItems}
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

			<Textfield
				id="pagination-textfield"
				bind:value={oneIndexedcurrentPage}
				on:keydown={(event) => event.key === 'Enter' ? currentPage = oneIndexedcurrentPage - 1 : {}}
			></Textfield> / {lastPage + 1}

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

	<Fab id="add-fab" color="primary" on:click={() => fabLoading ? {} : openCreateDialog()}>
		{#if fabLoading}
			<CircularProgress class="fab-circular-progress" style="height: 24px; width: 24px;" indeterminate />
		{:else}
			<Icon class="material-icons">add</Icon>
		{/if}
	</Fab>

	<Dialog
		bind:open
		surface$style="width: 600px; max-width: calc(100vw - 32px);"
	>
		<Title>{dialogVerb} {active.toLowerCase()}</Title>
		<div id="dialog-content">
			{#if dialogVerb === 'Delete'}
				Are you sure you want to delete this {active.toLowerCase()}
				(id: {active === Tabs.User ? user_id : (active === Tabs.Equipment ? equipment_id : equipment_category_id)}) ?
			{:else}
				{#if active === Tabs.User}
					<input bind:value={user_id} type="hidden" />
					<Textfield bind:value={user_username} label="username"></Textfield>
					<Textfield bind:value={user_password} type="password" label="password">
						<HelperText slot="helper">
							{dialogVerb !== 'Create' && user_password.length === 0 ? 'leave blank if you don\'t want to change' : ''}
							{invalidPassword ? 'please make sure your user password length is equal or longer than 8 characters' : ''}
						</HelperText>
					</Textfield>
					<Textfield bind:value={user_fullname} label="Full name"></Textfield>
					<Textfield bind:value={user_email} type="email" label="email">
						<HelperText slot="helper">
							{invalidEmail ? 'Invalid email address' : ''}
						</HelperText>
					</Textfield>
					<br />
					{#if current_user && current_user.role > 0}
						<!-- allow a User to edit itself -->
						<FormField>
							<Switch bind:checked={user_role_admin} />
							<span slot="label">Mark as administrator</span>
						</FormField>
					{/if}
				{:else if active === Tabs.Equipment}
					<input bind:value={equipment_id} type="hidden" />
					<Textfield bind:value={equipment_name} label="name"></Textfield>
					<Textfield bind:value={equipment_barcode} label="barcode"></Textfield>
					<Select
						key={(category) => `${(category && category.id) || ''}`}
						bind:value={equipment_category}
						label="category"
					>
						{#each __equipment_categories as category}
							<Option value={category}>{category.name}</Option>
						{/each}
					</Select>
					<br />
					<FormField>
						<Switch bind:checked={equipment_status_broken} />
						<span slot="label">Mark as Broken</span>
					</FormField>
					<div style="height: 100%;"></div>
				{:else if active === Tabs.EquipmentCategory}
					<input bind:value={equipment_category_id} type="hidden" />
					<Textfield bind:value={equipment_category_name} label="name"></Textfield>
				{/if}
			{/if}
		</div>
		<Actions>
			<Button on:click={() => {}}>
				<Label>Cancel</Label>
			</Button>
			<Button on:click={async () => {
				if (dialogVerb === 'Delete') {
					await doDelete();
				} else {
					await doCreateOrEdit();
				}

				fetchItems();
			}}>
				<Label>{dialogVerb}</Label>
			</Button>
		</Actions>
	</Dialog>

	<Snackbar leading bind:this={snackbar}>
		<Label>{errorMsg}</Label>
	</Snackbar>

	<div class="image-overlay" style={`visibility: ${imageOverlayOpen ? 'visible' : 'hidden'};`} on:click={() => imageOverlayOpen = false}>
		<img alt="" src={imageOverlayUrl} />
	</div>
</div>

<script lang="ts">
	import { browser } from '$app/env';
	import { get } from 'svelte/store';
	import { getStores, navigating, page, session } from '$app/stores';
	import Tab, { Label } from '@smui/tab';
	import TabBar from '@smui/tab-bar';
	import Button from '@smui/button';
	import Fab, { Icon } from '@smui/fab';
	import Dialog, { Title, Content as DialogContent, Actions } from '@smui/dialog';
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import Switch from '@smui/switch';
	import FormField from '@smui/form-field';
	import DataTable, { Head, Body, Row, Cell, Pagination } from '@smui/data-table';
	import IconButton from '@smui/icon-button';
	import LinearProgress from '@smui/linear-progress';
	import CircularProgress from '@smui/circular-progress';
	import Accordion, { Header, Panel, Content } from '@smui-extra/accordion';
	import Tooltip, { Wrapper } from '@smui/tooltip';
	import Snackbar, { SnackbarComponentDev } from '@smui/snackbar';
  import ImageList, { Item, ImageAspectContainer, Image, Supporting } from '@smui/image-list';
	import Select, { Option } from '@smui/select';
	import LayoutGrid, { Cell as LayoutGridCell } from '@smui/layout-grid';
	import { DateTime } from 'luxon';
	import type { User, Equipment, EquipmentCategory } from '$lib/db';
	import { errorHtmlToPlaintext } from '$lib/util';

	// TO-DO: CDN
	const CDN_URL = new URL(get(page).url.origin);
	CDN_URL.protocol = 'http';
	CDN_URL.port = '3009';

	// tab definitions and the active one
	enum Tabs {
		User = 'User',
		Equipment = 'Equipment',
		EquipmentCategory = 'Equipment Category',
	}
	let active = Tabs.User;

	// current logged in user
	export let current_user;

	// equipment categories to display in dialog
	export let __equipment_categories: EquipmentCategory[] = [];

	// items to be shown on data table
	export let items = [];
	export let nbrOfItems: number = 0;

	// if the items are completely loaded
	let itemsLoaded = true;

	// how many rows per data table page
	const rowsPerPage = 50;
	// the current data table page
	let currentPage = 0;

	// data table accordion status (closed by default)
	let accordionOpen: boolean[] = Array.from({ length: rowsPerPage }, () => false);
	// fetching status inside each data table accordion
	let accordionLoading: boolean[] = Array.from({ length: rowsPerPage }, () => false);

	// fetching status on create/edit/delete dialog
	let fabLoading = false;

	// reactive (computed) properties
	// first item index of the current page
	$: start = currentPage * rowsPerPage;
	// last item index of the current page
	$: end = Math.min(start + rowsPerPage, nbrOfItems);
	// 1-indexed current page
	$: oneIndexedcurrentPage = currentPage + 1;
	// how many pages the data table has
	$: lastPage = Math.max(Math.ceil(nbrOfItems / rowsPerPage) - 1, 0);
	// page bound check
	$: if (currentPage > lastPage) {
		currentPage = lastPage;
	}

	// fetch database reactive to `active` tab and `currentPage`
	$: active, searchQuery = '', fetchItems();
	$: currentPage, fetchItems();

	// TO-DO: this small hack to prevent fetching on initial render
	const REACTIVES = 2;
	let reacteds = 0;

	// snackbar for showing error messages
	let snackbar: SnackbarComponentDev;
	let errorMsg = '';

	// dialog status (closed by default)
	let open = false;
	// what are we going to do in the dialog (Create/Edit/Delete)
	let dialogVerb = 'Create';

	// user information for dialog
	let user_id = '';
	let user_username = '';
	let user_password = '';
	let user_fullname = '';
	let user_email = '';
	let user_role_admin = false;

	// equipment information for dialog
	let equipment_id = '';
	let equipment_name = '';
	let equipment_barcode = '';
	let equipment_category: EquipmentCategory;
	let equipment_status_broken = false;

	// equipment catergory information for dialog
	let equipment_category_id = '';
	let equipment_category_name = '';

	// image overlay
	let imageOverlayOpen = false;
	let imageOverlayUrl = '';

	// search box
	let searchQuery = '';
	let refetch = false;
	$: refetch, refetchItems();

	// re-fetch items on <Enter> in search box
	const refetchItems = async () => {
		if (refetch) {
			refetch = false;
			fetchItems();
		}
	};

	// reactive (computed) properties of password and email verifications
	$: invalidPassword = user_password.length > 0 && user_password.length < 8;
	$: invalidEmail = !user_email
		.toLowerCase()
		.match(
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		);

	// open the dialog for creating a new item
	const openCreateDialog = () => {

		// initialize input boxes
		if (active === Tabs.User) {
			user_id = '';
			user_username = '';
			user_fullname = '';
			user_password = '';
			user_email = '';
			user_role_admin = false;

		} else if (active === Tabs.Equipment) {
			equipment_id = '';
			equipment_name = '';
			equipment_barcode = '';
			equipment_category = __equipment_categories[0];
			equipment_status_broken = false;

		} else if (active === Tabs.EquipmentCategory) {
			equipment_category_id = '';
			equipment_category_name = '';
		}

		// open dialog
		open = true;
		dialogVerb = 'Create';
	};

	// open the dialog for editing an existing item
	const openEditDialog = (item: User | Equipment | EquipmentCategory) => {

		// initialize input boxes
		if (active === Tabs.User) {
			const v = item as User;
			user_id = `${v.id}`;
			user_username = v.username;
			user_fullname = v.fullname;
			user_password = '';
			user_email = v.email;
			user_role_admin = v.role >= 1;

		} else if (active === Tabs.Equipment) {
			const v = item as Equipment;
			equipment_id = `${v.id}`;
			equipment_name = v.name;
			equipment_barcode = v.barcode;
			equipment_category = v.category;
			equipment_status_broken = !!v.status;

		} else if (active === Tabs.EquipmentCategory) {
			const v = item as EquipmentCategory;
			equipment_category_id = `${v.id}`;
			equipment_category_name = v.name;
		}

		// open dialog
		open = true;
		dialogVerb = 'Edit';
	};

	// open the dialog for deleting an existing item
	const openDeleteDialog = (item: User | Equipment | EquipmentCategory) => {

		// mark user or equipment id for delete
		if (active === Tabs.User) {
			const v = item as User;
			user_id = `${v.id}`;

		} else if (active === Tabs.Equipment) {
			const v = item as Equipment;
			equipment_id = `${v.id}`;

		} else if (active === Tabs.EquipmentCategory) {
			const v = item as EquipmentCategory;
			equipment_category_id = `${v.id}`;
		}

		// open dialog
		open = true;
		dialogVerb = 'Delete';
	};

	// call api to create a new item or edit an existing item
	const doCreateOrEdit = async () => {

		let response: Response;

		// show fab activity indicator
		fabLoading = true;

		if (active === Tabs.User) {

			// verify user password and user_email
			if (invalidPassword || invalidEmail) {
				fabLoading = false;
				errorMsg = 'Please re-check your user password and email';
				snackbar.open();
				return;
			}

			// POST /user
			// user_id.length == 0 (Create)
			// user_id.length > 0 (Edit)
			response = await fetch('/user', {
				method: 'POST',
				body: new URLSearchParams({
					...(user_id.length ? { id: user_id } : {}),
					username: user_username,
					...(user_password.length > 0 ? { password: user_password } : {}),
					fullname: user_fullname,
					email: user_email,
					role: user_role_admin ? '1' : '0',
				}),
			});

		} else if (active === Tabs.Equipment) {

			// POST /equipment
			// equipment_id.length == 0 (Create)
			// equipment_id.length > 0 (Edit)
			response = await fetch('/equipment', {
				method: 'POST',
				body: new URLSearchParams({
					...(equipment_id.length ? { id: equipment_id } : {}),
					name: equipment_name,
					barcode: equipment_barcode,
					category_id: equipment_category.id,
					status: equipment_status_broken ? '1' : '0',
				}),
			});

		} else if (active === Tabs.EquipmentCategory) {

			// POST /equipment/category
			// equipment_id.length == 0 (Create)
			// equipment_id.length > 0 (Edit)
			response = await fetch('/equipment/category', {
				method: 'POST',
				body: new URLSearchParams({
					...(equipment_category_id.length ? { id: equipment_category_id } : {}),
					name: equipment_category_name,
				}),
			});
		}

		// hide fab activity indicator
		fabLoading = false;

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = errorHtmlToPlaintext(await response.text());
			snackbar.open();
		}
	};

	// call api to delete an existing item
	const doDelete = async () => {

		// DELETE /user or /equipment or /equipment/category
		let endpoint = 'user';
		let id = user_id;
		if (active === Tabs.Equipment) {
			endpoint = 'equipment';
			id = equipment_id;
		} else if (active === Tabs.EquipmentCategory) {
			endpoint = 'equipment/category';
			id = equipment_category_id;
		}

		// show fab activity indicator
		fabLoading = true;

		const response = await fetch(`/${endpoint}`, {
			method: 'DELETE',
			body: new URLSearchParams({
				id: id,
			}),
		});

		// hide fab activity indicator
		fabLoading = false;

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = errorHtmlToPlaintext(await response.text());
			snackbar.open();
		}
	};

	// call api to fetch items
	const fetchItems = async (collapse = true) => {

		// client-only
		if (!browser) {
			return;
		}

		// TO-DO: this small hack to prevent fetching on initial render
		if (reacteds < REACTIVES) {
			reacteds++;
			return;
		}

		// collapse the accordion?
		if (collapse) {
			accordionOpen = accordionOpen.map(_ => false);
		}

		// hide all accordion activity indicators		
		accordionLoading = accordionLoading.map(_ => false);

		// clear the table
		items = [];

		// display progress indicator
		itemsLoaded = false;

		// GET /user or /equipment or /equipment/category
		let endpoint = 'user';
		if (active === Tabs.Equipment) {
			endpoint = 'equipment';
		} else if (active === Tabs.EquipmentCategory) {
			endpoint = 'equipment/category';
		}

		const response = await fetch(`/${endpoint}?${new URLSearchParams({ offset: `${start}`, query: searchQuery }).toString()}`);

		// hide progress indicator
		itemsLoaded = true;

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = `Unable to fetch ${active}`;
			snackbar.open();
			return;
		}

		const json = await response.json();
		nbrOfItems = json.count;
		items = json.items;

		// also update categories for dialog
		if (active === Tabs.EquipmentCategory) {
			__equipment_categories = items;
		}
	};

	const fetchPhotosForEquipment = async (equipment_id: number) => {

		const response = await fetch(`/equipment/photo?${new URLSearchParams({ equipment_id: `${equipment_id}` }).toString()}`);

		// show error response on snackbar if not ok
		if (!response.ok) {
			errorMsg = `Unable to fetch ${active}`;
			snackbar.open();
			return;
		}

		// currently showing equipment in data table
		if (active === Tabs.Equipment) {

			const json = await response.json();

			// find the equipment in `items`
			const the_equipment_idx = items.findIndex((item: Equipment) => item.id === equipment_id);
			// return if not found
			if (the_equipment_idx < 0) {
				return;
			}

			items[the_equipment_idx].photos = json.items;
		}
	};
</script>

<style>
	:global(#add-fab) {
		position: fixed;
		right: 0;
		bottom: 0;
		margin: 0 30px 30px 0;
	}

	:global(#dialog-content) {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}

	:global(#search-txt-container) {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	:global(.mdc-dialog__surface) {
		overflow-y: visible;
	}

	:global(.mdc-menu-surface--open) {
		max-height: calc(50vh - 56px);
	}

	:global(.smui-accordion__panel > .smui-paper__content) {
		font-size: 14px;
	}

	:global(.smui-accordion__panel--open > .smui-paper__content) {
		padding: 14px 50px !important;
	}

	:global(.lending-equipments-list) {
		margin: 16px 0;
	}

	:global(#pagination-textfield) {
		width: 24px;
		height: 36px;
	}

	:global(.image-overlay) {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 3000;
		background-color: rgba(0, 0, 0, 0.85);
		text-align: center;
	}

	:global(.image-overlay > img) {
		position: relative;
		width: 1024px;
		margin-left: auto;
		margin-right: auto;
		top: 50%;
		-ms-transform: translateY(-50%);
		transform: translateY(-50%);
	}
</style>
