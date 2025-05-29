// FILE: script.js (Consolidated for index.html: POS, Buy/Sell, HAC, Packs)
document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js (Index Main): DOMContentLoaded. Waiting for Firebase...");
    let appLogicHasRun = false;

    function setupErrorUI(errorMessage) {
        if (appLogicHasRun && !errorMessage.includes("Manually initializing")) return;
        appLogicHasRun = true;
        console.error("script.js (Index Main): Firebase critical error:", errorMessage);
        alert("Critical error on Home page: " + errorMessage + " Some functionality will be disabled.");
        const loginForm = document.getElementById('main-employee-login-form');
        if (loginForm) {
            const loginButton = loginForm.querySelector('button[type="submit"]');
            if (loginButton) { loginButton.disabled = true; loginButton.textContent = "Login Disabled (DB Error)";}
        }
        const appContent = document.getElementById('application-main-content');
        if (appContent) appContent.style.display = 'none';
    }

    async function executeMainAppLogic(firebaseDetail) {
        if (appLogicHasRun) { console.log("script.js (Index Main): App logic already run."); return; }
        appLogicHasRun = true;
        console.log("script.js (Index Main): Running executeMainAppLogic.");

        if (!firebaseDetail || !firebaseDetail.db || !firebaseDetail.functions) {
            setupErrorUI("Firebase details not properly passed to main app logic."); return;
        }
        const db = firebaseDetail.db;
        const firestore = firebaseDetail.functions;

        const employeeLoginContainer = document.getElementById('employee-login-container');
        const employeeLoginForm = document.getElementById('main-employee-login-form');
        const employeePasswordInput = document.getElementById('main-employee-password');
        const mainLoginError = document.getElementById('main-login-error');
        const applicationMainContent = document.getElementById('application-main-content');
        const viewSwitcher = document.getElementById('view-switcher');
        const showPosViewBtn = document.getElementById('show-pos-view-btn');
        const showBuySellViewBtn = document.getElementById('show-buysell-view-btn');
        const posViewContainer = document.getElementById('pos-view-container');
        const buySellViewContainer = document.getElementById('buysell-view-container');
        const processingEmployeeSelect = document.getElementById('processing-employee-select');
        const posItemsContainer = document.getElementById('pos-items-container');
        const categoryButtons = document.querySelectorAll('#category-buttons-container .category-button');
        const posTotalDisplay = document.getElementById('total');
        const posCheckoutButton = document.getElementById('checkout-button-pos');
        const posClearCartButton = document.getElementById('clear-cart-button-pos');
        const hacMembershipItemEl = document.getElementById('hac-membership-item');
        const hacSignupModalEl = document.getElementById('hac-signup-modal');
        const closeHacModalButtonEl = hacSignupModalEl ? hacSignupModalEl.querySelector('.close-hac-modal') : null;
        const submitHacSignupButtonEl = document.getElementById('submit-hac-signup-button');
        const hacModalFirstNameInput = document.getElementById('hac-modal-first-name');
        const hacModalLastNameInput = document.getElementById('hac-modal-last-name');
        const hacModalPhoneNumberInput = document.getElementById('hac-modal-phone-number');
        const hacModalDriverLicenseInput = document.getElementById('hac-modal-driver-license');
        const hacModalEmailInput = document.getElementById('hac-modal-email');
        const hacModalStatusEl = document.getElementById('hac-modal-status');
        const hacStaffSearchTermInputEl = document.getElementById('hac-staff-search-term');
        const hacStaffSearchButtonEl = document.getElementById('hac-staff-search-button');
        const hacStaffClearSearchButtonEl = document.getElementById('hac-staff-clear-search-button');
        const hacStaffSearchResultsDisplayEl = document.getElementById('hac-staff-search-results');
        const hacCurrentPromoDisplayStaffEl = document.getElementById('hac-current-promo-display-staff');
        const hacPromoMonthStaffDisplayEl = document.getElementById('hac-promo-month-staff');
        const hacPromoTextStaffDisplayEl = document.getElementById('hac-promo-text-staff');
        const mikesBuysItemsContainer = document.getElementById('mikes-buys-items-container');
        const mikesSellsItemsContainer = document.getElementById('mikes-sells-items-container');
        const totalOwedToCustomerDisplay = document.getElementById('total-owed-to-customer');
        const totalOwedToMikesDisplay = document.getElementById('total-owed-to-mikes');
        const summaryOwedCustomerDisplay = document.getElementById('summary-owed-customer');
        const summaryOwedMikesDisplay = document.getElementById('summary-owed-mikes');
        const netTransactionAmountDisplay = document.getElementById('net-transaction-amount');
        const netTransactionPartyDisplay = document.getElementById('net-transaction-party');
        const buySellClearButton = document.getElementById('buysell-clear-button');
        const buySellCheckoutButton = document.getElementById('buysell-checkout-button');
        const buySellStatusMessage = document.getElementById('buysell-status-message');
        const posHardcodedItems = posItemsContainer ? Array.from(posItemsContainer.querySelectorAll('.item:not(.buysell-page-item)')) : [];

        let currentSharedEmployeePassword = null;
        const EMPLOYEE_PASSWORD_DOC_ID = "accessSettings";
        const EMPLOYEE_PASSWORD_FIELD = "employeeLoginPassword";
        let managedEmployees = [];
        const taxRatesByRank = { "Trainee": 0.20, "Staff": 0.15, "Senior Staff": 0.10, "Manager": 0.00 };
        const buySellItemDefinitions = {
            buy: {
                "Crab": { price: 87, image: "fs-crab.webp" }, // Assuming a generic crab image for buy
                "Minnow": { price: 175, image: "fs-minnow.webp" },
                "Haddock": { price: 175, image: "fs-haddock.webp" },
                "Pollock": { price: 175, image: "fs-pollock.webp" },
                "Crappie": { price: 175, image: "fs-crappie.webp" },
                "Trout": { price: 175, image: "fs-trout.webp" },
                "Rainbow Trout": { price: 175, image: "fs-rainbowtrout.webp" },
                "Garfish": { price: 185, image: "fs-garfish.webp" },
                "Striped Bass": { price: 200, image: "fs-stripedbass.webp" },
                "Salmon": { price: 200, image: "fs-salmon.png" }, // Whole fish
                "Northern Pike": { price: 225, image: "fs-northernpike.webp" },
                "Tuna": { price: 250, image: "fs-tuna.webp" }, // Whole fish
                "Deer Meat": { price: 75, image: "meat.webp" },
                "Boar Meat": { price: 175, image: "meat.webp" },
                "Rabbit Meat": { price: 375, image: "meat.webp" },
                "Rat Meat": { price: 475, image: "meat.webp" },
                "Animal Bones": { price: 225, image: "animal_bones.webp" },
                "Salmon Meat": { price: 10, image: "fishmeat_salmon.webp" }, // Chunk
                "Slimy Fish Meat": { price: 2, image: "fishmeat_slimy.webp" },
                "White Fish Meat": { price: 10, image: "fishmeat_white.webp" }, // Chunk
                "Deer Hide": { price: 125, image: "hide.webp" },
                "Boar Hide": { price: 225, image: "hide.webp" },
                "Rabbit Hide": { price: 325, image: "hide.webp" },
                "Rat Hide": { price: 525, image: "hide.webp" },
                "Boar Tusk": { price: 3000, image: "boar_tusk.webp" },
                "Deer Antler": { price: 2000, image: "deer_antlers.webp" },
                "Rabbit Foot": { price: 5000, image: "rabbit_foot.webp" },
                "Rat Tail": { price: 6000, image: "rat_tail.webp" },
            },
            sell: {
                "White Fish Meat": { price: 17, image: "fishmeat_white.webp" },
                "Salmon Meat": { price: 20, image: "fishmeat_salmon.webp" },
                "Crab": { price: 90, image: "fs-crab.webp" }, // Crab Mikes Sells
            }
        };
        // ***** END MODIFIED buySellItemDefinitions *****
        const buySellCart = { buy: {}, sell: {} };
        let currentHacPromo = { month: 'N/A', text: 'Loading...'};

        async function loadSharedEmployeePassword() {
            if (!firestore.doc || !firestore.getDoc) {
                console.error("Firestore 'doc' or 'getDoc' function is not available in loadSharedEmployeePassword.");
                currentSharedEmployeePassword = "MikesEmployee"; return;
            }
            try {
                const passwordDocRef = firestore.doc(db, "siteSettings", EMPLOYEE_PASSWORD_DOC_ID);
                const docSnap = await firestore.getDoc(passwordDocRef);
                if (docSnap.exists() && docSnap.data()[EMPLOYEE_PASSWORD_FIELD]) {
                    currentSharedEmployeePassword = docSnap.data()[EMPLOYEE_PASSWORD_FIELD];
                } else { currentSharedEmployeePassword = "MikesEmployee"; }
                console.log("Shared employee password loaded:", currentSharedEmployeePassword ? currentSharedEmployeePassword.substring(0,3)+"..." : "Failed/Default");
            } catch (e) { console.error("Pass load error", e); currentSharedEmployeePassword = "MikesEmployee"; }
        }

        function updateLoginView(isLoggedIn) {
            console.log("Index: updateLoginView called with isLoggedIn:", isLoggedIn);
            if (isLoggedIn) {
                if (employeeLoginContainer) employeeLoginContainer.style.display = 'none';
                if (applicationMainContent) applicationMainContent.style.display = 'block';
                if (mainLoginError) mainLoginError.style.display = 'none';
                if (typeof addLogoutButton === "function") addLogoutButton(); else console.error("addLogoutButton not defined");
                if (viewSwitcher) viewSwitcher.style.display = 'flex';
                if (showPosViewBtn && typeof showPosViewBtn.click === 'function') showPosViewBtn.click(); else switchToPosView();
            } else {
                if (employeeLoginContainer) employeeLoginContainer.style.display = 'block';
                if (applicationMainContent) applicationMainContent.style.display = 'none';
                if (viewSwitcher) viewSwitcher.style.display = 'none';
            }
        }

        async function loadAndPopulateEmployees() {
            let firestoreEmployees = [];
            try {
                const q = firestore.query(firestore.collection(db, "employees"), firestore.orderBy("fullName"));
                const snap = await firestore.getDocs(q);
                snap.forEach(doc => firestoreEmployees.push({ id: doc.id, ...doc.data() }));
            } catch (e) { console.error("Error loading employees:", e); }
            const fallbacks = [{ fullName: "Preston Stone", rank: "Manager", employeeNumber:"40262"}];
            managedEmployees = [...firestoreEmployees];
            fallbacks.forEach(fb => { if (!managedEmployees.some(e => e.fullName === fb.fullName)) managedEmployees.push(fb); });
            managedEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName));

            if (processingEmployeeSelect) {
                processingEmployeeSelect.innerHTML = '<option value="">-- Select Employee --</option>';
                managedEmployees.forEach(emp => {
                    const opt = new Option(emp.fullName, emp.fullName);
                    opt.dataset.rank = emp.rank || "N/A";
                    opt.dataset.employeeNumber = emp.employeeNumber || "N/A";
                    processingEmployeeSelect.appendChild(opt);
                });
            }
        }

        function switchToPosView() {
            if (posViewContainer) posViewContainer.style.display = 'block'; else console.warn("POS View Container not found");
            if (buySellViewContainer) buySellViewContainer.style.display = 'none'; else console.warn("Buy/Sell View Container not found");
            if (showPosViewBtn) showPosViewBtn.classList.add('active');
            if (showBuySellViewBtn) showBuySellViewBtn.classList.remove('active');
            console.log("Switched to POS View");
            const allCategoryButton = document.querySelector('#category-buttons-container .category-button[data-category-filter="All"]');
            if (allCategoryButton && !allCategoryButton.classList.contains('active')) {
                 allCategoryButton.click();
            } else if (categoryButtons.length > 0 && !document.querySelector('#category-buttons-container .category-button.active')) {
                categoryButtons[0].click();
            } else if (categoryButtons.length > 0 && document.querySelector('#category-buttons-container .category-button.active')) {
                document.querySelector('#category-buttons-container .category-button.active').click();
            }
             calculateMainPOSTotal();
             if (typeof updateDisplayBox === 'function') updateDisplayBox();
        }

        function switchToBuySellView() {
            if (posViewContainer) posViewContainer.style.display = 'none';
            if (buySellViewContainer) buySellViewContainer.style.display = 'block';
            if (showPosViewBtn) showPosViewBtn.classList.remove('active');
            if (showBuySellViewBtn) showBuySellViewBtn.classList.add('active');
            console.log("Switched to Buy/Sell View");
            if (mikesBuysItemsContainer && (!mikesBuysItemsContainer.hasChildNodes() || (mikesBuysItemsContainer.children.length === 1 && mikesBuysItemsContainer.querySelector('.loading-message')))) {
                 renderBuySellPageItems();
            } else if (mikesSellsItemsContainer && (!mikesSellsItemsContainer.hasChildNodes() || (mikesSellsItemsContainer.children.length === 1 && mikesSellsItemsContainer.querySelector('.loading-message')))) {
                if (mikesBuysItemsContainer && !mikesBuysItemsContainer.querySelector('.buysell-page-item')) {
                     renderBuySellPageItems();
                }
            } else if (mikesBuysItemsContainer && !mikesBuysItemsContainer.querySelector('.buysell-page-item')) {
                 renderBuySellPageItems();
            }
            updateBuySellViewTotals();
        }

        function clearMainPOSCart() {
            posHardcodedItems.forEach(item => {
                const quantityInput = item.querySelector('.quantity');
                if (quantityInput) {
                    quantityInput.value = 0;
                    quantityInput.dispatchEvent(new Event('input', {bubbles: true}));
                }
                if (item.id === 'hac-membership-item') {
                    item.removeAttribute('data-hac-member-sale');
                    item.removeAttribute('data-new-hac-member-id');
                    const currentFilter = document.querySelector('#category-buttons-container .category-button.active')?.dataset.categoryFilter || 'All';
                    const itemCategory = item.dataset.category;
                    item.style.display = (currentFilter === 'All' || itemCategory === currentFilter) ? 'flex' : 'none';
                }
            });
            if (typeof updateDisplayBox === 'function' && typeof displayedPackItems === 'object') {
                Object.keys(displayedPackItems).forEach(k => displayedPackItems[k] = 0);
                 if (typeof selectedPackQuantities === 'object') {
                    Object.keys(selectedPackQuantities).forEach(k => selectedPackQuantities[k] = 0);
                 }
                updateDisplayBox(); // This will also call calculateMainPOSTotal through pack item listeners
            } else {
                calculateMainPOSTotal(); // Call if no pack logic to ensure total updates
            }
            console.log("Main POS Cart cleared.");
        }

        function calculateMainPOSTotal() {
            let total = 0;
            posHardcodedItems.forEach(item => {
                const isHacActiveSale = item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true';
                const isVisibleNonHac = item.id !== 'hac-membership-item' && item.style.display !== 'none';
                if (!(isHacActiveSale || isVisibleNonHac)) return;

                const price = parseFloat(item.getAttribute('data-price'));
                let quantity = 0;
                const quantityInput = item.querySelector('.quantity');

                if (isHacActiveSale) {
                    quantity = 1;
                    if (quantityInput) { quantityInput.style.color = 'limegreen'; }
                } else {
                    if (quantityInput) {
                        quantity = parseInt(quantityInput.value) || 0;
                        quantityInput.style.color = quantity > 0 ? 'limegreen' : '#a0aec0';
                        // CSS handles background transparency, so JS only needs to manage text color
                    }
                }
                if (!isNaN(price) && quantity > 0) {
                    total += price * quantity;
                } else if (quantity === 0 && quantityInput && item.id !== 'hac-membership-item') {
                     quantityInput.style.color = '#a0aec0';
                }
            });
            if (posTotalDisplay) {
                posTotalDisplay.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }

        async function checkoutPOS() {
            if (!processingEmployeeSelect || !processingEmployeeSelect.value) {
                alert("Please select the processing employee."); return;
            }
            const selectedOpt = processingEmployeeSelect.options[processingEmployeeSelect.selectedIndex];
            const employeeName = selectedOpt.value;
            const employeeRank = selectedOpt.dataset.rank;
            const currentTotal = parseFloat(posTotalDisplay.textContent.replace(/,/g, '')) || 0;
            let isHacSaleOnly = false;
            if (hacMembershipItemEl && hacMembershipItemEl.getAttribute('data-hac-member-sale') === 'true') {
                const otherItemsQuantity = posHardcodedItems.reduce((acc, item) => {
                    if (item.id !== 'hac-membership-item' && item.style.display !== 'none') {
                        const qtyInput = item.querySelector('.quantity');
                        return acc + (parseInt(qtyInput?.value) || 0);
                    } return acc;
                }, 0);
                if (otherItemsQuantity === 0) isHacSaleOnly = true;
            }
            if (currentTotal === 0 && !isHacSaleOnly) { alert("No POS items selected."); return; }

            const taxRate = taxRatesByRank[employeeRank] !== undefined ? taxRatesByRank[employeeRank] : 0.00;
            const taxAmount = currentTotal * taxRate;
            const netTotalAfterTax = currentTotal - taxAmount;
            let saleItemsStructured = [];
            posHardcodedItems.forEach(item => {
                let quantity = 0;
                const pTag = item.querySelector('p');
                const itemName = pTag ? pTag.textContent.split(':')[0].trim() : 'Unknown Item';
                const isHacActiveSaleInLoop = item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true';
                const isVisibleNonHacInLoop = item.id !== 'hac-membership-item' && item.style.display !== 'none';

                if (isHacActiveSaleInLoop) { quantity = 1; }
                else if (isVisibleNonHacInLoop) {
                    const quantityInput = item.querySelector('.quantity');
                    if (quantityInput) quantity = parseInt(quantityInput.value) || 0;
                }
                if (quantity > 0) saleItemsStructured.push({ itemName, quantity, price: parseFloat(item.getAttribute('data-price')) });
            });
             if (saleItemsStructured.length === 0) {
                 if (isHacSaleOnly && currentTotal > 0 && hacMembershipItemEl && hacMembershipItemEl.getAttribute('data-hac-member-sale') === 'true') {
                    const hacP = hacMembershipItemEl.querySelector('p');
                    const hacName = hacP ? hacP.textContent.split(':')[0].trim() : 'HAC MEMBERSHIP';
                    if (!saleItemsStructured.some(si => si.itemName === hacName)) {
                        saleItemsStructured.push({itemName: hacName, quantity: 1, price: parseFloat(hacMembershipItemEl.getAttribute('data-price'))});
                    }
                 } else { alert("No POS items with quantity > 0."); return; }
            }
            const transactionData = {
                transactionType: "POS Sale", employeeName, employeeRank, items: saleItemsStructured,
                subTotal: parseFloat(currentTotal.toFixed(2)), taxRateApplied: `${(taxRate * 100).toFixed(0)}%`,
                taxAmountPaidToMikes: parseFloat(taxAmount.toFixed(2)), netTotalForEmployee: parseFloat(netTotalAfterTax.toFixed(2)),
                fullSaleTotal: parseFloat(currentTotal.toFixed(2)), taxesCleared: false, createdAt: firestore.serverTimestamp()
            };
            try {
                const docRef = await firestore.addDoc(firestore.collection(db, "transactions"), transactionData);
                console.log("POS Transaction saved ID: ", docRef.id);
                clearMainPOSCart();
                alert(
                    `POS Transaction Completed for: ${employeeName} (${employeeRank || 'N/A'})\n` +
                    `---------------------------------------\n` +
                    `Total Sale Amount: $${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                    `Fee to Mikes (${(taxRate * 100).toFixed(0)}%): $${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                    `Net Amount for Employee: $${netTotalAfterTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                );
            }catch (error) { console.error("Error saving POS transaction: ", error); alert(`Failed to save POS transaction. ${error.message}`);}
        }

        function openHacSignupModal() {
            if (hacSignupModalEl) {
                if(hacModalFirstNameInput) hacModalFirstNameInput.value = '';
                if(hacModalLastNameInput) hacModalLastNameInput.value = '';
                if(hacModalPhoneNumberInput) hacModalPhoneNumberInput.value = '';
                if(hacModalDriverLicenseInput) hacModalDriverLicenseInput.value = '';
                if(hacModalEmailInput) hacModalEmailInput.value = '';
                if(hacModalStatusEl) { hacModalStatusEl.textContent = ''; hacModalStatusEl.style.color = 'green';  }
                hacSignupModalEl.style.display = "flex";
            }
        }
        function closeHacSignupModal() { if (hacSignupModalEl) hacSignupModalEl.style.display = "none"; }

        async function submitHacMemberSignup() {
             if (!hacModalFirstNameInput || !hacModalLastNameInput || !hacModalFirstNameInput.value.trim() || !hacModalLastNameInput.value.trim()) {
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "First and Last name are required."; hacModalStatusEl.style.color = "red"; } return;
            }
            if(submitHacSignupButtonEl) {submitHacSignupButtonEl.disabled = true; submitHacSignupButtonEl.textContent = "Submitting...";}
            const newMemberData = {
                firstName: hacModalFirstNameInput.value.trim(), lastName: hacModalLastNameInput.value.trim(),
                phoneNumber: hacModalPhoneNumberInput.value.trim() || null, driverLicense: hacModalDriverLicenseInput.value.trim() || null,
                email: hacModalEmailInput.value.trim().toLowerCase() || null,
                isEligible: true, membershipPurchaseDate: firestore.serverTimestamp(), createdAt: firestore.serverTimestamp() };
            try {
                const docRef = await firestore.addDoc(firestore.collection(db, "hacMembers"), newMemberData);
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "Signup successful!"; hacModalStatusEl.style.color = "green"; }
                if(hacMembershipItemEl) {
                    hacMembershipItemEl.setAttribute('data-hac-member-sale', 'true');
                    hacMembershipItemEl.setAttribute('data-new-hac-member-id', docRef.id);
                    const hacQtyInput = hacMembershipItemEl.querySelector('.quantity');
                    if(hacQtyInput) hacQtyInput.value = 1;
                    const activeFilter = document.querySelector('#category-buttons-container .category-button.active')?.dataset.categoryFilter;
                    if (activeFilter === 'All' || activeFilter === hacMembershipItemEl.dataset.category) {
                        hacMembershipItemEl.style.display = 'flex';
                    }
                }
                calculateMainPOSTotal();
                setTimeout(() => { closeHacSignupModal(); if(submitHacSignupButtonEl){ submitHacSignupButtonEl.disabled = false; submitHacSignupButtonEl.textContent = "Submit & Add to Cart";} }, 1500);
            } catch (error) {
                console.error("Error adding HAC member", error);
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "Error: "+error.message; hacModalStatusEl.style.color = "red"; }
                if(submitHacSignupButtonEl){ submitHacSignupButtonEl.disabled = false; submitHacSignupButtonEl.textContent = "Submit & Add to Cart";}
            }
        }
        async function loadHacPromoForStaff() {
            try {
                const promoDocRef = firestore.doc(db, "siteSettings", "hacConfiguration");
                const docSnap = await firestore.getDoc(promoDocRef);
                if (docSnap.exists()) {
                    currentHacPromo = { month: docSnap.data().currentPromoMonth || 'N/A', text: docSnap.data().currentPromoText || 'No promo text.' };
                } else { currentHacPromo = { month: 'N/A', text: 'No promo configured.' };}
                if(hacPromoMonthStaffDisplayEl) hacPromoMonthStaffDisplayEl.textContent = currentHacPromo.month;
                if(hacPromoTextStaffDisplayEl) hacPromoTextStaffDisplayEl.textContent = currentHacPromo.text;
            } catch (e) { console.error("Err loading HAC promo", e); currentHacPromo = { month: 'Error', text: 'Load failed.' };}
        }
        async function searchHacMembersForStaff() {
            if (!hacStaffSearchTermInputEl || !hacStaffSearchResultsDisplayEl) return;
            const searchTerm = hacStaffSearchTermInputEl.value.trim().toLowerCase();
            if (!searchTerm) {
                hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Enter a name or phone to search.</i></p>";
                if(hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none'; return;
            }
            hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Searching...</i></p>";
            try {
                const q = firestore.query(firestore.collection(db, "hacMembers"), firestore.orderBy("lastName"), firestore.orderBy("firstName"));
                const snap = await firestore.getDocs(q);
                let all = []; snap.forEach(d => all.push({id: d.id, ...d.data()}));
                const filtered = all.filter(m => `${m.firstName||''} ${m.lastName||''}`.toLowerCase().includes(searchTerm) || m.phoneNumber?.includes(searchTerm) || m.driverLicense?.toLowerCase().includes(searchTerm) || m.email?.toLowerCase().includes(searchTerm)  );
                renderHacSearchResultsForStaff(filtered);
            } catch(e) { console.error("HAC Search error", e); hacStaffSearchResultsDisplayEl.innerHTML = "<p>Search error.</p>"; }
        }
        function renderHacSearchResultsForStaff(members) {
             if (!hacStaffSearchResultsDisplayEl) return;
            hacStaffSearchResultsDisplayEl.innerHTML = '';
            if (members.length === 0) {
                hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>No HAC members found.</i></p>";
                if (hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none'; return;
            }
            members.forEach(mem => {
                const itemDiv = document.createElement('div'); itemDiv.className = 'member-result-item';
                const eligClass = mem.isEligible ? 'hac-eligible' : 'hac-not-eligible';
                const eligText = mem.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                const purchaseDate = mem.membershipPurchaseDate?.toDate ? mem.membershipPurchaseDate.toDate().toLocaleDateString() : 'N/A';
                let claimBtnHTML = ''; if (mem.isEligible) claimBtnHTML = `<button class="action-button claim-benefit-button" data-member-id="${mem.id}" data-member-name="${mem.firstName} ${mem.lastName}">Claim Benefit</button>`;
                itemDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span><strong>${mem.firstName} ${mem.lastName}</strong> <span class="${eligClass}">${eligText}</span></span>
                        ${claimBtnHTML}
                    </div>
                    <div style="font-size: 0.85em; color: #ccc;">
                        Phone: ${mem.phoneNumber || 'N/A'} | DL: ${mem.driverLicense || 'N/A'}<br>
                        Email: ${mem.email || 'N/A'} | Purchased: ${purchaseDate}
                    </div>`;
                hacStaffSearchResultsDisplayEl.appendChild(itemDiv);
            });
            hacStaffSearchResultsDisplayEl.querySelectorAll('.claim-benefit-button').forEach(b => b.addEventListener('click', handleClaimBenefitClick));
            if(hacPromoMonthStaffDisplayEl && hacPromoTextStaffDisplayEl && hacCurrentPromoDisplayStaffEl){
                hacPromoMonthStaffDisplayEl.textContent = currentHacPromo.month;
                hacPromoTextStaffDisplayEl.textContent = currentHacPromo.text;
                hacCurrentPromoDisplayStaffEl.style.display = (currentHacPromo.month && currentHacPromo.month !== 'N/A' && currentHacPromo.text && currentHacPromo.text !== 'No promo configured.' && currentHacPromo.text !== 'No promo text.') ? 'block' : 'none';
            }
        }
        async function handleClaimBenefitClick(event) {
            const btn = event.currentTarget; const id = btn.dataset.memberId; const name = btn.dataset.memberName;
            if(!confirm(`Mark ${name}'s benefit as claimed?`)) return;
            btn.disabled = true; btn.textContent = "Processing...";
            try {
                await firestore.updateDoc(firestore.doc(db, "hacMembers", id), { isEligible: false });
                alert(`${name}'s benefit claimed.`); searchHacMembersForStaff();
            } catch (e) { console.error("Claim benefit error", e); alert("Error."); btn.disabled = false; btn.textContent = "Claim Benefit"; }
        }

        function renderBuySellPageItems() {
            if (!mikesBuysItemsContainer || !mikesSellsItemsContainer) return;
            mikesBuysItemsContainer.innerHTML = ''; mikesSellsItemsContainer.innerHTML = '';
            Object.entries(buySellItemDefinitions.buy).forEach(([name, price]) => {
                mikesBuysItemsContainer.appendChild(createBuySellPageItemDiv(name, price, 'buy'));
            });
            Object.entries(buySellItemDefinitions.sell).forEach(([name, price]) => {
                mikesSellsItemsContainer.appendChild(createBuySellPageItemDiv(name, price, 'sell'));
            });
        }

        function createBuySellPageItemDiv(name, itemData, type) { // itemData is {price, image}
            const div = document.createElement('div');
            div.className = 'item buysell-page-item';
            div.setAttribute('data-price', itemData.price);
            div.setAttribute('data-name', name);
            div.setAttribute('data-type', type);

            const img = document.createElement('img');
            img.src = itemData.image || "Images/placeholder_buysell.jpg"; // Use item's image or fallback
            img.alt = name;
            img.style.pointerEvents = "none";

            const p = document.createElement('p');
            p.textContent = `${name}: $${itemData.price.toLocaleString()}`;
            p.style.pointerEvents = "none";

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'quantity';
            input.min = "0";

            // Ensure cart entry exists for this item and type
            if (!buySellCart[type]) {
                buySellCart[type] = {};
            }
            if (!buySellCart[type][name]) {
                buySellCart[type][name] = { quantity: 0, price: itemData.price };
            }
            input.value = buySellCart[type][name].quantity;

            // Inside createBuySellPageItemDiv (and similar for POS items)
            function updateInputStyleFromValue() {
                const val = parseInt(input.value) || 0;
                input.style.color = val > 0 ? 'limegreen' : '#a0aec0'; // Default color for 0
                // input.style.backgroundColor = val > 0 ? 'lightgreen' : '#e2e8f0'; // NO LONGER NEEDED if background is transparent
            }
            updateInputStyleFromValue();

            input.addEventListener('input', () => {
                let currentQuantity = parseInt(input.value) || 0;
                if (currentQuantity < 0) {
                    currentQuantity = 0;
                    input.value = 0;
                }
                // Ensure cart entry exists if user clears input then types again
                if (!buySellCart[type][name]) {
                     buySellCart[type][name] = { quantity: 0, price: itemData.price };
                }
                buySellCart[type][name].quantity = currentQuantity;
                updateInputStyleFromValue();
                updateBuySellViewTotals();
            });

            div.addEventListener('click', (event) => {
                if (event.target === input) {
                    input.focus(); return;
                }
                if (!buySellCart[type][name]) {
                    buySellCart[type][name] = { quantity: 0, price: itemData.price };
                }
                buySellCart[type][name].quantity++;
                input.value = buySellCart[type][name].quantity;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            div.appendChild(img); div.appendChild(p); div.appendChild(input);
            return div;
        }

function updateBuySellViewTotals() {
        let toCust = 0; Object.values(buySellCart.buy).forEach(i => {if(i) toCust += i.quantity * i.price});
        let toMikes = 0; Object.values(buySellCart.sell).forEach(i => {if(i)toMikes += i.quantity * i.price});

        if(totalOwedToCustomerDisplay) totalOwedToCustomerDisplay.textContent = toCust.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if(totalOwedToMikesDisplay) totalOwedToMikesDisplay.textContent = toMikes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if(summaryOwedCustomerDisplay) summaryOwedCustomerDisplay.textContent = `$${toCust.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if(summaryOwedMikesDisplay) summaryOwedMikesDisplay.textContent = `$${toMikes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const net = toMikes - toCust;
        if(netTransactionAmountDisplay) netTransactionAmountDisplay.textContent = `$${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        if(netTransactionPartyDisplay) netTransactionPartyDisplay.textContent = net > 0 ? "Customer Owes Mikes" : net < 0 ? "Mikes Owes Customer" : "Even Trade";
    }
        function clearBuySellSelections() {
            buySellCart.buy = {}; buySellCart.sell = {};
            document.querySelectorAll('#buysell-view-container .buysell-page-item input.quantity').forEach(i => {
                i.value = 0; i.style.color = '#a0aec0'; // CSS handles background
            });
            updateBuySellViewTotals();
            if(buySellStatusMessage) buySellStatusMessage.textContent = '';
        }
        async function finalizeBuySellTrade() {
            if (!processingEmployeeSelect || !processingEmployeeSelect.value) { alert("Select employee."); return; }
            const empOpt = processingEmployeeSelect.options[processingEmployeeSelect.selectedIndex];
            const empName = empOpt.value; const empRank = empOpt.dataset.rank;
            let boughtVal = 0; Object.values(buySellCart.buy).forEach(i=>{if(i)boughtVal+=i.price*i.quantity});
            let soldVal = 0; Object.values(buySellCart.sell).forEach(i=>{if(i)soldVal+=i.price*i.quantity});
            if(boughtVal === 0 && soldVal === 0) {alert("No items."); return;}
            let itemsTraded = [];
            for(const type of ['buy', 'sell']) {Object.entries(buySellCart[type]).forEach(([n,d])=>{if(d && d.quantity>0)itemsTraded.push({itemName:n,quantity:d.quantity,pricePerUnit:d.price,type})})}
            const data = {
                transactionType:"Buy/Sell Trade", employeeName:empName, employeeRank:empRank || 'N/A', itemsTraded,
                totalValueBoughtFromCustomer:boughtVal, totalValueSoldToCustomer:soldVal,
                netAmountForMikes: soldVal - boughtVal, createdAt: firestore.serverTimestamp()
            };
            try {
                const ref = await firestore.addDoc(firestore.collection(db, "transactions"), data);
                if(buySellStatusMessage){buySellStatusMessage.textContent="Trade finalized!";buySellStatusMessage.style.color="green";}
                clearBuySellSelections(); setTimeout(()=> {if(buySellStatusMessage)buySellStatusMessage.textContent=''},3000);
            } catch(e){console.error("B/S save err",e); if(buySellStatusMessage){buySellStatusMessage.textContent="Error: " + e.message ;buySellStatusMessage.style.color="red";}}
        }

        function attachAppEventListeners() {
            console.log("script.js (Index Main): Attaching App Event Listeners");
            if (employeeLoginForm) {
                 employeeLoginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const enteredPassword = employeePasswordInput.value;
                    console.log("Login form submitted. Entered:", enteredPassword);
                    if (!currentSharedEmployeePassword) {
                        console.log("Password not pre-loaded, loading now for main login...");
                        await loadSharedEmployeePassword();
                    }
                    console.log("Comparing with actual password for main login:", currentSharedEmployeePassword);
                    if (enteredPassword === currentSharedEmployeePassword) {
                        console.log("Password MATCH on index page!");
                        if (typeof grantEmployeeSession === "function") grantEmployeeSession(); else console.error("grantEmployeeSession is not defined");
                        updateLoginView(true);
                        await initializePageContentAfterLogin();
                    } else {
                         console.log("Password MISMATCH on index page.");
                         if(mainLoginError) { mainLoginError.textContent = "Invalid Password."; mainLoginError.style.display = 'block';}
                         if(employeePasswordInput) employeePasswordInput.value = "";
                    }
                });
            }

            if (showPosViewBtn) showPosViewBtn.addEventListener('click', switchToPosView);
            if (showBuySellViewBtn) showBuySellViewBtn.addEventListener('click', switchToBuySellView);

            if (posClearCartButton) posClearCartButton.addEventListener('click', clearMainPOSCart);
            if (posCheckoutButton) posCheckoutButton.addEventListener('click', checkoutPOS);
            if (buySellClearButton) buySellClearButton.addEventListener('click', clearBuySellSelections);
            if (buySellCheckoutButton) buySellCheckoutButton.addEventListener('click', finalizeBuySellTrade);

            if (categoryButtons) {
                categoryButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        if (!posViewContainer || posViewContainer.style.display === 'none') switchToPosView();
                        const filter = button.getAttribute('data-category-filter');
                        categoryButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        posHardcodedItems.forEach(item => {
                            const itemCategory = item.getAttribute('data-category');
                            if (item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true') {
                                item.style.display = 'flex';
                            } else {
                                item.style.display = (filter === 'All' || itemCategory === filter) ? 'flex' : 'none';
                            }
                        });
                        calculateMainPOSTotal();
                    });
                });
            }

            posHardcodedItems.forEach(item => {
                const quantityInput = item.querySelector('.quantity');
                if (item.id === 'hac-membership-item') {
                    const hacButton = item.querySelector('.add-to-cart-hac');
                    if (hacButton) hacButton.addEventListener('click', openHacSignupModal);
                } else {
                    if (quantityInput) {
                         quantityInput.addEventListener('input', () => {
                            if (posViewContainer?.style.display !== 'none') {
                                calculateMainPOSTotal();
                            }
                        });
                    }
                    if (item.dataset.pack !== 'true') { // Non-pack POS item click
                        item.addEventListener('click', (event) => {
                            if (posViewContainer?.style.display === 'none') return;
                            if (event.target.tagName === 'INPUT' || event.target.tagName === 'LABEL' || event.target.closest('button')) {
                                if(event.target.tagName === 'INPUT') event.target.focus();
                                return;
                            }
                            if (quantityInput) {
                                quantityInput.value = (parseInt(quantityInput.value) || 0) + 1;
                                quantityInput.dispatchEvent(new Event('input', {bubbles: true}));
                            }
                        });
                    }
                }
            });

            if (closeHacModalButtonEl) closeHacModalButtonEl.addEventListener('click', closeHacSignupModal);
            if (hacSignupModalEl) window.addEventListener('click', (event) => { if (event.target === hacSignupModalEl) closeHacSignupModal(); });
            if (submitHacSignupButtonEl) submitHacSignupButtonEl.addEventListener('click', submitHacMemberSignup);
            if(hacStaffSearchButtonEl) hacStaffSearchButtonEl.addEventListener('click', searchHacMembersForStaff);
            if(hacStaffSearchTermInputEl) hacStaffSearchTermInputEl.addEventListener('keypress', (e) => { if(e.key === 'Enter') {e.preventDefault(); searchHacMembersForStaff();} });
            if(hacStaffClearSearchButtonEl) {
                hacStaffClearSearchButtonEl.addEventListener('click', () => {
                    if(hacStaffSearchTermInputEl) hacStaffSearchTermInputEl.value = '';
                    if(hacStaffSearchResultsDisplayEl) hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Enter a name or phone to look up HAC member status.</i></p>";
                    if(hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none';
                });
            }
        }

        async function initializePageContentAfterLogin() {
            console.log("Index: initializePageContentAfterLogin called");
            await loadAndPopulateEmployees();
            if (showPosViewBtn && typeof showPosViewBtn.click === 'function') {
                 showPosViewBtn.click();
            } else { switchToPosView(); }

            if (posViewContainer && posViewContainer.style.display !== 'none') { // Check if POS view is actually active
                calculateMainPOSTotal();
                if (typeof initPackTracker === 'function' && posItemsContainer?.querySelector('.item[data-pack="true"]')) {
                    initPackTracker(); // This will call updateDisplayBox
                } else { // If no pack items, ensure pack box is hidden
                    const packBox = document.getElementById('pack-display-box');
                    if (packBox) packBox.style.display = 'none';
                }
                await loadHacPromoForStaff();
            }
        }

        async function initializePageOnLoad() {
            console.log("Index: initializePageOnLoad called");
            attachAppEventListeners();
            if (typeof checkEmployeeSession === "function" && checkEmployeeSession()) {
                console.log("script.js (Index Main): Employee session active from previous login.");
                updateLoginView(true);
                await initializePageContentAfterLogin();
            } else {
                console.log("script.js (Index Main): No active session. Showing login form.");
                 if(typeof checkEmployeeSession !== "function") console.error("Index page: checkEmployeeSession from utility.js is not available!");
                updateLoginView(false);
                await loadSharedEmployeePassword();
            }
        }
        initializePageOnLoad();
    } // End of executeMainAppLogic

    let firebaseReadyProcessed = false;
    document.addEventListener('firebaseReady', (e) => {
        console.log("Index: Firebase ready event RECEIVED by script.js.");
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            firebaseReadyProcessed = true;
            console.log("Index: Processing 'firebaseReady' event.");
            executeMainAppLogic(e.detail);
        } else if (appLogicHasRun) { console.log("Index: 'firebaseReady' received, but app logic already run."); }
        else if (firebaseReadyProcessed) { console.log("Index: 'firebaseReady' received, but already processed by this listener.");}
    });
    document.addEventListener('firebaseError', (e) => {
        console.error("Index: Firebase error event RECEIVED by script.js:", e.detail?.error);
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            firebaseReadyProcessed = true;
            setupErrorUI("Firebase SDK init failed in HTML. " + (e.detail?.error?.message || "Unknown error."));
        }
    });
    setTimeout(() => {
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            console.warn("Index: Timeout. Checking Firebase manually because 'firebaseReady'/'firebaseError' event was missed.");
            if (window.isFirebaseReady === true && window.db && window.firestoreFunctions) {
                console.log("Index: Firebase IS ready via window flag (timeout). Calling executeMainAppLogic.");
                executeMainAppLogic({ db: window.db, functions: window.firestoreFunctions });
            } else if (window.isFirebaseReady === false) {
                 console.error("Index: Firebase error flag IS SET via window (timeout). Calling setupErrorUI.");
                setupErrorUI("App init timeout. Firebase reported an error during HTML setup.");
            } else {
                console.error("Index: Firebase ready state UNKNOWN after timeout. Calling setupErrorUI.");
                setupErrorUI("App init timeout. Firebase status unknown.");
            }
        } else {
            // console.log("Index: Timeout check, but appLogicHasRun or firebaseReadyProcessed is true. No action needed from timeout.");
        }
    }, 3500);
});

// === Global Pack Tracker Definitions ===
const packDefinitions = {
  hunting_pack: { "Hunting Rifle": 1, "30.06 Ammo": 100, "Bait (Choice Of)": 10, "Knife": 1, "Hunting Map": 1, "Orange Hunting Vest": 1, },
  scoped_hunting_pack: { "Scoped Rifle": 1, "30.06 Ammo": 100, "Bait (Choice Of)": 10, "Knife": 1, "Hunting Map": 1, },
  fishing_pack: { "COOLERS": 1, "Beer": 10, "MSG TAILGATE CHAIR": 2, },
  scuba_pack: { "Scuba Tank": 2, "Shark Repellent": 2, "Bandages": 10, },
  camping_pack: { "COOLERS": 2, "MSG TAILGATE CHAIR": 2, "Beer": 20, "Binoculars": 2, },
  tiny_biters_pack: { "Value Cast Rod": 1, "Broke Ass Reel": 1, "Cheap Mono Line": 10, "HOOK #1": 10, "MAGGOTS BAIT": 50, },
  trout_pack: { "Value Cast Rod": 1, "Broke Ass Reel": 1, "Cheap Mono Line": 10, "HOOK #2": 10, "WAXWORMS BAIT": 50, },
  big_boy_pack: { "Elemental Rod": 1, "LINE SNIFFER REEL": 1, "BITE SIZE LINE": 10, "HOOK #2": 10, "HOOK #6": 10, "NIGHTWORMS BAIT": 50, },
  dock_special_pack: { "Brutas Rod": 1, "FISHRUS REEL": 1, "NOODLE LINE": 10, "HOOK #3": 10, "MAGGOTS BAIT": 50, },
  pike_pack: { "Nero Rod": 1, "Rock Bottom Reel": 1, "Mobey Mono Line": 10, "HOOK #3": 10, "NIGHTWORMS BAIT": 50, },
  tuna_pack: { "Zeus Rod": 1, "Thunder Reel": 1, "LIGHTNING LINE": 10, "HOOK #10": 10, "LEECH BAIT": 50, },
  mahi_pack: { "Elemental Rod": 1, "LINE SNIFFER REEL": 1, "BITE SIZE LINE": 10, "HOOK #1": 10, },
};
const displayedPackItems = {};
const selectedPackQuantities = {};

function initPackTracker() {
    console.log("Pack Tracker: Initializing...");
    const packItemElements = document.querySelectorAll('#pos-items-container .item[data-pack="true"]');
    let packBox = document.getElementById('pack-display-box');

    // Ensure packBox exists or create it
    if (!packBox) {
        const posTotalH1 = document.querySelector('#pos-view-container > h1#total');
        const cartActionsDiv = document.querySelector('#pos-view-container .cart-actions');
        let insertionPoint = cartActionsDiv || posTotalH1;

        if (insertionPoint && insertionPoint.parentNode) {
            packBox = document.createElement('div');
            packBox.id = 'pack-display-box';
            packBox.style.cssText = "margin-top: 0px; padding:0px; background-color: rgba(30,30,30,0.7); border-radius: 8px; display:none; border-width: 0px; width:100%; max-width: 600px; margin-left:auto; margin-right:auto; max-height:0px; overflow:hidden; transition: max-height 0.4s ease, padding 0.3s ease, margin-top 0.3s ease, border-width 0.3s ease;";
            packBox.innerHTML = '<h3 style="text-align:center; margin: 10px 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Combined Pack Contents</h3><div id="pack-item-list" style="padding: 0 15px 10px 15px; max-height: 200px; overflow-y: auto;"></div>';
            insertionPoint.parentNode.insertBefore(packBox, insertionPoint);
            console.log("Pack Tracker: pack-display-box created.");
        } else {
            console.warn("Pack Tracker: Could not find insertion point for display box.");
            return;
        }
    }

    if (packItemElements.length === 0) {
        console.log("Pack Tracker: No pack items found.");
        if (packBox) packBox.style.display = 'none';
        return;
    }

    packItemElements.forEach(itemDiv => {
        const input = itemDiv.querySelector('input.quantity');
        if (!input || !input.id || !input.id.startsWith('quantity_')) {
             console.warn("Pack Tracker: Skipping item, input or ID malformed", itemDiv); return;
        }
        const packId = input.id.replace('quantity_', '');
        if (!packDefinitions[packId]) {
            console.warn(`Pack Tracker: Definition not found for pack ID: ${packId}`); return;
        }

        // Initialize from current input value, then update displayedPackItems
        const initialQty = parseInt(input.value) || 0;
        selectedPackQuantities[packId] = 0; // Start with 0 for delta calculation in handlePackChange
        if (initialQty > 0) {
             handlePackChange(packId, initialQty, true); // Pass true for isInitialLoad
        }


        itemDiv.addEventListener('click', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
            e.stopPropagation(); e.preventDefault();
            if (document.getElementById('pos-view-container')?.style.display === 'none') return;
            input.value = (parseInt(input.value) || 0) + 1;
            input.dispatchEvent(new Event('input'));
        });
        input.addEventListener('input', () => {
            if (document.getElementById('pos-view-container')?.style.display === 'none') return;
            handlePackChange(packId, parseInt(input.value) || 0);
            if (typeof calculateMainPOSTotal === 'function') calculateMainPOSTotal();
        });
    });
    updateDisplayBox();
    console.log("Pack Tracker: Initialized.");
}

function handlePackChange(packId, newQuantity, isInitialLoad = false) {
    const oldQuantity = selectedPackQuantities[packId] || 0;
    const packContents = packDefinitions[packId];
    if (!packContents || newQuantity < 0) return;

    let quantityChange = newQuantity - oldQuantity;

    if (isInitialLoad) { // If it's the initial load from an existing input value
        // We want displayedPackItems to reflect the sum of *all* initial pack quantities
        // So, the "change" is effectively the newQuantity if oldQuantity was 0 (or not yet set for this pack)
        // If oldQuantity (from selectedPackQuantities) was >0 from a previous pack, that's fine,
        // this logic correctly adds the new pack's items.
        // The key is that displayedPackItems should accumulate.
        // No, this logic was flawed. `isInitialLoad` implies we are setting it fresh.
        // We need to clear previous contribution if `oldQuantity` in `selectedPackQuantities` was from *this specific pack*.
        // The current `quantityChange = newQuantity - oldQuantity` handles this correctly if selectedPackQuantities[packId]
        // was accurately reflecting the *previous state of this specific packId*.
        // The issue was likely that selectedPackQuantities[packId] was not reset for initial calculation.
        // Let's stick to delta for general updates.
        // The initPackTracker loop should handle initial setup.
    }

    for (const [item, countPerPack] of Object.entries(packContents)) {
        displayedPackItems[item] = (displayedPackItems[item] || 0) + (countPerPack * quantityChange);
        if (displayedPackItems[item] < 0) displayedPackItems[item] = 0;
    }
    selectedPackQuantities[packId] = newQuantity;
    updateDisplayBox();
}

function updateDisplayBox() {
    const boxDiv = document.getElementById('pack-display-box');
    if (!boxDiv) { console.warn("updateDisplayBox: pack-display-box not found."); return; }

    let listDiv = boxDiv.querySelector('#pack-item-list');
    if (!listDiv) {
        if (boxDiv.innerHTML.includes('pack-item-list')) {
             listDiv = boxDiv.querySelector('#pack-item-list');
        }
        if (!listDiv) {
            console.warn("updateDisplayBox: #pack-item-list structure missing. Rebuilding.");
            boxDiv.innerHTML = '<h3 style="text-align:center; margin: 10px 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Combined Pack Contents</h3><div id="pack-item-list" style="padding: 0 15px 10px 15px; max-height: 200px; overflow-y: auto;"></div>';
            listDiv = boxDiv.querySelector('#pack-item-list');
            if(!listDiv) { console.error("updateDisplayBox: Failed to ensure #pack-item-list. Hiding box."); boxDiv.style.display = 'none'; return; }
        }
    }

    listDiv.innerHTML = '';
    const entries = Object.entries(displayedPackItems).filter(([itemName, count]) => count > 0);

    if (entries.length === 0) {
        boxDiv.style.maxHeight = '0px';
        boxDiv.style.paddingTop = '0px';
        boxDiv.style.paddingBottom = '0px';
        boxDiv.style.borderWidth = '0px';
        boxDiv.style.marginTop = '0px';
        boxDiv.style.overflow = 'hidden';
        if (getComputedStyle(boxDiv).display !== 'none') {
            setTimeout(() => {
                if (Object.values(displayedPackItems).every(c => c === 0)) {
                    boxDiv.style.display = 'none';
                }
            }, 400); // Animation time
        }
        return;
    }

    boxDiv.style.display = 'block';
    boxDiv.style.borderWidth = '1px';
    boxDiv.style.padding = '15px';
    boxDiv.style.marginTop = '20px';
    boxDiv.style.overflow = 'hidden'; // For maxHeight animation

    entries.forEach(([item, count]) => {
        const div = document.createElement('div');
        div.textContent = `${item}: ${count}`;
        div.style.marginBottom = '4px';
        listDiv.appendChild(div);
    });

    boxDiv.style.maxHeight = 'none'; // Reset to measure
    requestAnimationFrame(() => {
        const h3El = boxDiv.querySelector('h3');
        const h3Height = h3El ? h3El.offsetHeight + parseInt(getComputedStyle(h3El).marginBottom || 0) + parseInt(getComputedStyle(h3El).paddingBottom || 0) : 0;
        const listActualHeight = listDiv.scrollHeight || 0;
        const boxStyle = getComputedStyle(boxDiv);
        const boxPaddingVertical = parseInt(boxStyle.paddingTop) + parseInt(boxStyle.paddingBottom);

        let targetBoxHeight = h3Height + listActualHeight + boxPaddingVertical; // Total internal height needed by box
        const maxListContentHeight = 1000; // Max height for the list content itself

        if (listActualHeight > maxListContentHeight) {
            listDiv.style.maxHeight = maxListContentHeight + 'px';
            listDiv.style.overflowY = 'auto';
            targetBoxHeight = h3Height + maxListContentHeight + boxPaddingVertical + 10; // +10 buffer
        } else {
            listDiv.style.maxHeight = 'none';
            listDiv.style.overflowY = 'hidden';
        }
        // Cap overall box height if needed, or let it grow
        // For now, let it grow based on list content + H3 + its own padding
        boxDiv.style.maxHeight = (targetBoxHeight < 50 && entries.length > 0 ? 50 : targetBoxHeight) + 'px'; // Min height if showing with just h3
    });
}